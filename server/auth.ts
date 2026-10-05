import { randomBytes, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../src/lib/db';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  res.cookie('cc_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: expiresAt, path: '/' });
}
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.cc_session;
  if (!process.env.DATABASE_URL || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) { res.status(401).json({ error: 'Please sign in to continue.' }); return; }
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  if (!session || session.expiresAt < new Date()) { res.status(401).json({ error: 'Your session has expired. Please sign in.' }); return; }
  res.locals.user = session.user; next();
}
export async function rateLimit(key: string, limit: number, duration: number) {
  const now = new Date();
  const result = await db.$queryRaw<{ count: number }[]>`INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${new Date(Date.now() + duration)}) ON CONFLICT ("key") DO UPDATE SET "count" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END, "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${new Date(Date.now() + duration)} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  return result[0].count <= limit;
}
