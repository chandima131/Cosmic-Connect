import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { demoJobs } from '../src/lib/demo';
async function seed() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12 || process.env.ADMIN_PASSWORD.startsWith('set-a-')) throw new Error('Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (12+ characters) before seeding.');
  await db.user.upsert({ where: { email: process.env.ADMIN_EMAIL.toLowerCase() }, update: {}, create: { name: 'Workspace Administrator', email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'ADMIN' } });
  for (const job of demoJobs) { const { id, ...data } = job; await db.job.upsert({ where: { id }, update: {}, create: { id, ...data, closingDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } }); }
  const names = [['Alex', 'Morgan'], ['Jordan', 'Ellis'], ['Taylor', 'Reed'], ['Casey', 'Brooks'], ['Riley', 'Parker'], ['Sam', 'Hayes'], ['Jamie', 'Blake'], ['Robin', 'Lane'], ['Charlie', 'Quinn'], ['Drew', 'Harper']];
  for (let i = 0; i < names.length; i++) { const [firstName, lastName] = names[i]; const job = demoJobs[i % 5]; await db.candidate.upsert({ where: { email: `candidate${i + 1}@example.test` }, update: {}, create: { id: `demo-candidate-${i + 1}`, firstName, lastName, email: `candidate${i + 1}@example.test`, phone: '07700 900' + String(100 + i), location: job.location, currentJobTitle: job.title, yearsExperience: 2 + i, skills: job.skills, qualifications: 'Fictional profile for development. Relevant professional qualification.' } }); }
  const statuses = ['NEW', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'] as const;
  for (let i = 0; i < 15; i++) await db.application.upsert({ where: { id: `demo-application-${i + 1}` }, update: {}, create: { id: `demo-application-${i + 1}`, candidateId: `demo-candidate-${i % 10 + 1}`, jobId: demoJobs[(i + Math.floor(i / 10)) % 5].id, reference: `CC-DEMO-${String(i + 1).padStart(4, '0')}`, status: statuses[i % 5], consentAt: new Date(), createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) } });
  process.stdout.write('Seeded administrator, 5 fictional vacancies, 10 fictional candidates and 15 applications. No sample CVs are included.\n');
}
seed().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }).finally(() => db.$disconnect());
