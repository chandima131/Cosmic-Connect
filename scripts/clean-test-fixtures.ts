import 'dotenv/config';
import { db } from '../src/lib/db';
try {
  if (!process.env.DATABASE_URL?.includes('127.0.0.1:5441/cosmic_connect')) throw new Error('This cleanup only runs against the isolated local development database.');
  const result = await db.job.deleteMany({ where: { title: { startsWith: 'QA Software Engineer ' }, status: 'ARCHIVED', applications: { none: {} } } });
  process.stdout.write(`Removed ${result.count} archived automated-test vacancies from the local database.\n`);
} finally { await db.$disconnect(); }
