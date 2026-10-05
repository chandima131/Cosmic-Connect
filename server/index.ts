import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { db } from '../src/lib/db';
import { publicJobs, publicJob, demoMode } from '../src/lib/jobs';
import { createSession, requireAuth, hashToken, rateLimit } from './auth';
import { candidateSchema, jobSchema, loginSchema, noteSchema, statusSchema, validateDocument } from './validation';
import { storage } from './storage';
import { jobHtml } from './seo';
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], fontSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } } }));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
    const origin = req.get('origin');
    const allowed = process.env.APP_URL || 'http://localhost:5173';
    if (!origin || origin !== new URL(allowed).origin) { res.status(403).json({ error: 'Request origin is not allowed.' }); return; }
  }
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true, demo: demoMode }));
app.get('/api/jobs', async (_req, res) => res.json({ jobs: await publicJobs(), demo: demoMode }));
app.get('/api/jobs/:key', async (req, res) => { const job = await publicJob(String(req.params.key)); if (!job) { res.status(404).json({ error: 'Vacancy not found.' }); return; } res.json(job); });
app.post('/api/login', async (req, res) => {
  if (demoMode) { res.status(503).json({ error: 'Recruiter login requires a configured PostgreSQL database. See the local setup guide.' }); return; }
  if (!await rateLimit(`login:${req.ip}`, 10, 15 * 60 * 1000)) { res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' }); return; }
  const data = loginSchema.parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const valid = await bcrypt.compare(data.password, user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!user || !valid) { res.status(401).json({ error: 'Email or password is incorrect.' }); return; }
  await createSession(user.id, res); res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});
app.get('/api/session', requireAuth, (_req, res) => res.json(res.locals.user));
app.post('/api/logout', requireAuth, async (req, res) => { await db.session.deleteMany({ where: { id: hashToken(req.cookies.cc_session) } }); res.clearCookie('cc_session', { path: '/' }); res.json({ ok: true }); });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 16, fieldSize: 10000 } });
app.post('/api/applications', async (req, res, next) => {
  if (demoMode) { res.status(503).json({ error: 'Applications are disabled in the preview. Configure PostgreSQL to enable secure submissions.' }); return; }
  if (!await rateLimit(`apply:${req.ip}`, 8, 60 * 60 * 1000)) { res.status(429).json({ error: 'Too many submissions. Please try again later.' }); return; }
  next();
}, upload.single('cv'), async (req, res) => {
  const { consent, jobId, ...data } = candidateSchema.parse(req.body);
  if (!consent || !req.file) { res.status(400).json({ error: 'Consent and a CV are required.' }); return; }
  const job = jobId ? await db.job.findUnique({ where: { id: jobId } }) : null;
  if (jobId && (!job || job.status !== 'OPEN' || job.closingDate < new Date())) { res.status(409).json({ error: 'This vacancy is no longer accepting applications.' }); return; }
  const mime = validateDocument(req.file.originalname, req.file.mimetype, req.file.buffer);
  const key = await storage.put(req.file.buffer);
  try {
    const result = await db.$transaction(async tx => {
      if (jobId) {
        const open = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Job" WHERE "id" = ${jobId} AND "status" = 'OPEN' AND "closingDate" > NOW() FOR SHARE`;
        if (!open.length) throw new Error('This vacancy is no longer accepting applications.');
      }
      const candidate = await tx.candidate.upsert({ where: { email: data.email }, create: { ...data, linkedinUrl: data.linkedinUrl || null }, update: {} });
      if (!jobId && await tx.application.findFirst({ where: { candidateId: candidate.id, jobId: null, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })) throw new Error('Your CV has already been submitted today.');
      const document = await tx.candidateDocument.create({ data: { candidateId: candidate.id, cvFileUrl: key, cvOriginalName: path.basename(req.file!.originalname).replace(/[\r\n]/g, ''), cvMimeType: mime } });
      return tx.application.create({ data: { candidateId: candidate.id, jobId: jobId || null, documentId: document.id, reference: `CC-${randomBytes(6).toString('hex').toUpperCase()}`, consentAt: new Date() }, select: { reference: true } });
    });
    res.status(201).json({ ...result, name: `${data.firstName} ${data.lastName}`, job: job?.title || 'Talent community' });
  } catch (error) { await storage.remove(key); throw error; }
});
app.use('/api/admin', requireAuth);
app.get('/api/admin/dashboard', async (_req, res) => {
  const [activeJobs, applications, newApplications, candidates, recentApplications, recentJobs] = await Promise.all([db.job.count({ where: { status: 'OPEN', closingDate: { gte: new Date() } } }), db.application.count(), db.application.count({ where: { status: 'NEW' } }), db.candidate.count(), db.application.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { candidate: true, job: true } }), db.job.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { _count: { select: { applications: true } } } })]);
  res.json({ activeJobs, applications, newApplications, candidates, recentApplications, recentJobs });
});
app.get('/api/admin/jobs', async (_req, res) => res.json(await db.job.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { applications: true } } } })));
app.get('/api/admin/jobs/:id', async (req, res) => { const job = await db.job.findUnique({ where: { id: String(req.params.id) }, include: { applications: { include: { candidate: true } } } }); if (!job) { res.status(404).json({ error: 'Job not found.' }); return; } res.json(job); });
const slug = (title: string, location: string) => `${title}-${location}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomBytes(3).toString('hex');
app.post('/api/admin/jobs', async (req, res) => { const data = jobSchema.parse(req.body); res.status(201).json(await db.job.create({ data: { ...data, slug: slug(data.title, data.location), publishedAt: data.status === 'OPEN' ? new Date() : null } })); });
app.patch('/api/admin/jobs/:id', async (req, res) => {
  const data = jobSchema.parse(req.body); const existing = await db.job.findUniqueOrThrow({ where: { id: String(req.params.id) } });
  res.json(await db.job.update({ where: { id: existing.id }, data: { ...data, publishedAt: data.status === 'OPEN' ? existing.publishedAt || new Date() : existing.publishedAt } }));
});
app.post('/api/admin/jobs/:id/duplicate', async (req, res) => {
  const job = await db.job.findUniqueOrThrow({ where: { id: String(req.params.id) } });
  const { id, createdAt, updatedAt, publishedAt, ...data } = job;
  void id; void createdAt; void updatedAt; void publishedAt;
  res.status(201).json(await db.job.create({ data: { ...data, title: `${job.title} (copy)`, slug: slug(job.title, job.location), status: 'DRAFT' } }));
});
app.post('/api/admin/jobs/:id/status', async (req, res) => {
  if (!['CLOSED', 'ARCHIVED', 'OPEN'].includes(req.body.status)) { res.status(400).json({ error: 'Invalid status.' }); return; }
  const job = await db.job.findUniqueOrThrow({ where: { id: String(req.params.id) } });
  if (req.body.status === 'OPEN' && job.closingDate <= new Date()) { res.status(400).json({ error: 'Update the closing date before publishing.' }); return; }
  res.json(await db.job.update({ where: { id: job.id }, data: { status: req.body.status, publishedAt: req.body.status === 'OPEN' ? job.publishedAt || new Date() : job.publishedAt } }));
});
app.get('/api/admin/applications', async (_req, res) => res.json(await db.application.findMany({ orderBy: { createdAt: 'desc' }, include: { candidate: true, job: true } })));
app.get('/api/admin/applications/:id', async (req, res) => {
  const item = await db.application.findUnique({ where: { id: String(req.params.id) }, include: { candidate: true, job: true, document: true, notes: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }, history: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } } });
  if (!item) { res.status(404).json({ error: 'Application not found.' }); return; } res.json(item);
});
app.patch('/api/admin/applications/:id/status', async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const item = await db.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string; status: import('@prisma/client').ApplicationStatus }[]>`SELECT "id", "status" FROM "Application" WHERE "id" = ${String(req.params.id)} FOR UPDATE`;
    if (!rows.length) throw new Error('Application not found.');
    const previous = rows[0];
    if (previous.status !== status) await tx.applicationStatusHistory.create({ data: { applicationId: previous.id, fromStatus: previous.status, toStatus: status, userId: res.locals.user.id } });
    return tx.application.update({ where: { id: previous.id }, data: { status } });
  }); res.json(item);
});
app.get('/api/admin/candidates', async (_req, res) => res.json(await db.candidate.findMany({ orderBy: { updatedAt: 'desc' }, include: { applications: { orderBy: { createdAt: 'desc' }, include: { job: true } } } })));
app.get('/api/admin/candidates/:id', async (req, res) => {
  const item = await db.candidate.findUnique({ where: { id: String(req.params.id) }, include: { documents: { orderBy: { createdAt: 'desc' } }, applications: { include: { job: true }, orderBy: { createdAt: 'desc' } }, notes: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } } });
  if (!item) { res.status(404).json({ error: 'Candidate not found.' }); return; } res.json(item);
});
app.post('/api/admin/candidates/:id/notes', async (req, res) => {
  const data = noteSchema.parse(req.body);
  if (data.applicationId && !await db.application.findFirst({ where: { id: data.applicationId, candidateId: String(req.params.id) } })) { res.status(400).json({ error: 'Application does not belong to this candidate.' }); return; }
  res.status(201).json(await db.recruiterNote.create({ data: { ...data, candidateId: String(req.params.id), userId: res.locals.user.id } }));
});
app.delete('/api/admin/candidates/:id', async (req, res) => {
  if (res.locals.user.role !== 'ADMIN') { res.status(403).json({ error: 'Only administrators may delete candidate data.' }); return; }
  const documents = await db.candidateDocument.findMany({ where: { candidateId: String(req.params.id) } });
  // Removing files first means a storage failure leaves the database record available for retry.
  for (const doc of documents) await storage.remove(doc.cvFileUrl).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await db.candidate.delete({ where: { id: String(req.params.id) } }); res.json({ ok: true });
});
app.get('/api/admin/documents/:id', async (req, res) => {
  const doc = await db.candidateDocument.findUniqueOrThrow({ where: { id: String(req.params.id) } });
  res.setHeader('Content-Type', doc.cvMimeType); res.setHeader('Content-Disposition', `${req.query.download === '1' || doc.cvMimeType !== 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(doc.cvOriginalName)}`);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.send(await storage.get(doc.cvFileUrl));
});
app.get('/robots.txt', (_req, res) => res.type('text').send('User-agent: *\nDisallow: /admin\nDisallow: /apply\nDisallow: /submit-cv\nDisallow: /api\n'));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('dist'), { index: false }));
  app.get('/{*path}', async (req, res) => {
    if (req.path.startsWith('/api')) { res.status(404).json({ error: 'Endpoint not found.' }); return; }
    if (/^\/(admin|apply|submit-cv)/.test(req.path)) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    let html = await readFile(path.resolve('dist/index.html'), 'utf8');
    if (req.path.startsWith('/jobs/')) { const job = await publicJob(req.path.split('/')[2]); if (!job) res.status(404); else html = jobHtml(html, job, new URL(process.env.APP_URL || 'http://localhost:4000').origin); }
    res.type('html').send(html);
  });
}
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) { res.status(400).json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }); return; }
  if (error instanceof multer.MulterError) { res.status(400).json({ error: 'Upload one CV up to 5 MB.' }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError) { res.status(error.code === 'P2002' ? 409 : error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2002' ? 'An application has already been received for this email and vacancy.' : error.code === 'P2025' ? 'Record not found.' : 'Unable to save this change.' }); return; }
  const safe = error instanceof Error && /^(Upload a valid|This vacancy|Your CV has already|Application not found)/.test(error.message);
  if (!safe) process.stderr.write(`API error: ${error instanceof Error ? error.name : 'UnknownError'}\n`);
  res.status(safe ? 400 : 500).json({ error: safe ? (error as Error).message : 'The service is unavailable. Please try again later.' });
});
app.listen(Number(process.env.PORT || 4000), '127.0.0.1', () => process.stdout.write(`Cosmic Connect API ready on port ${process.env.PORT || 4000}${demoMode ? ' (public preview)' : ''}\n`));
