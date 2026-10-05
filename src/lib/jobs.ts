import { db } from './db';
import { demoJobs } from './demo';
export const demoMode = !process.env.DATABASE_URL;
export async function publicJobs() {
  if (demoMode) return demoJobs;
  return db.job.findMany({ where: { status: 'OPEN', closingDate: { gte: new Date() } }, orderBy: { publishedAt: 'desc' } });
}
export async function publicJob(key: string) {
  if (demoMode) return demoJobs.find(j => j.id === key || j.slug === key) ?? null;
  return db.job.findFirst({ where: { OR: [{ id: key }, { slug: key }], status: { in: ['OPEN', 'CLOSED'] } } });
}
export function salary(j: { salaryVisible: boolean; salaryText: string | null; salaryMin: number | null; salaryMax: number | null }) {
  if (!j.salaryVisible) return 'Salary on application';
  if (j.salaryText) return j.salaryText;
  const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
  return j.salaryMin ? `${gbp(j.salaryMin)}${j.salaryMax ? ` – ${gbp(j.salaryMax)}` : ''}` : 'Competitive salary';
}
