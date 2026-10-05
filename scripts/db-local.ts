import EmbeddedPostgres from 'embedded-postgres';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('.local-postgres');
await mkdir(root, { recursive: true });
const credentialsFile = path.join(root, 'credentials.json');
const credentials: { password: string } = existsSync(credentialsFile) ? JSON.parse(await readFile(credentialsFile, 'utf8')) : { password: randomBytes(24).toString('hex') };
if (!existsSync(credentialsFile)) await writeFile(credentialsFile, JSON.stringify(credentials), { mode: 0o600 });
const pg = new EmbeddedPostgres({ databaseDir: path.join(root, 'data'), user: 'cosmic', password: credentials.password, port: 5441, persistent: true, authMethod: 'scram-sha-256', initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-c', 'listen_addresses=127.0.0.1'] });
if (!existsSync(path.join(root, 'data', 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const found = await client.query("SELECT 1 FROM pg_database WHERE datname = 'cosmic_connect'");
await client.end();
if (!found.rowCount) await pg.createDatabase('cosmic_connect');
if (!existsSync('.env')) {
  const password = randomBytes(18).toString('base64url');
  await writeFile('.env', `DATABASE_URL="postgresql://cosmic:${credentials.password}@127.0.0.1:5441/cosmic_connect"\nAPP_URL="http://localhost:5173"\nPORT="4000"\nNODE_ENV="development"\nSTORAGE_PROVIDER="local"\nSTORAGE_PATH=".storage"\nADMIN_EMAIL="admin@example.test"\nADMIN_PASSWORD="${password}"\n`, { mode: 0o600 });
  process.stdout.write('Created .env with unique local credentials. Read ADMIN_EMAIL and ADMIN_PASSWORD from that file to sign in after seeding.\n');
}
process.stdout.write('Local PostgreSQL is ready on 127.0.0.1:5441. Keep this process running. Apply migrations and seed in another terminal.\n');
await new Promise<void>(() => {});
