import 'dotenv/config';
import { db } from '../src/lib/db';
try {
  const now = new Date();
  const [sessions, limits] = await db.$transaction([db.session.deleteMany({ where: { expiresAt: { lt: now } } }), db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } })]);
  process.stdout.write(`Removed ${sessions.count} expired sessions and ${limits.count} expired rate limits.\n`);
} finally { await db.$disconnect(); }
