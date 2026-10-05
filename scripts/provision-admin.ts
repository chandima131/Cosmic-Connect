import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { loginSchema } from '../server/validation';
async function main() {
  const credentials = loginSchema.parse({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (credentials.password.length < 12 || credentials.password.startsWith('set-a-')) throw new Error('Choose a unique administrator password of at least 12 characters.');
  const exists = await db.user.findUnique({ where: { email: credentials.email } });
  if (exists) throw new Error('Account already exists. Provisioning does not overwrite credentials.');
  await db.user.create({ data: { email: credentials.email, passwordHash: await bcrypt.hash(credentials.password, 12), name: 'Workspace Administrator', role: 'ADMIN' } });
  process.stdout.write('Administrator provisioned. Remove ADMIN_PASSWORD from the runtime environment after setup.\n');
}
main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }).finally(() => db.$disconnect());
