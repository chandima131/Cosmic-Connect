# Cosmic Connect Recruitment Portal

A modular recruitment MVP with a public jobs website and authenticated recruiter workspace. Built with **React, TypeScript and Vite**, a separate **Node.js / Express API**, **Tailwind CSS**, **PostgreSQL** and **Prisma**.

## Features

- Responsive branded home, vacancy search, keyword/location/type/experience filters and job details.
- Job applications and general CV submissions without candidate accounts; consent, file validation and application reference numbers.
- Authenticated recruiter dashboard, job creation/editing/publishing/closing/archiving/duplication.
- Candidate and application search, application status updates with activity history, private recruiter notes, CV viewing/downloads and administrator-only candidate deletion.
- Server-side validation, opaque database-backed sessions, HTTP-only cookies, same-origin mutation checks, persistent rate limiting and private local document storage.
- Five fictional vacancies, ten fictional candidates and fifteen fictional applications in the idempotent development seed.

Candidate accounts, AI parsing/ranking, notifications, payment, scheduling and external integrations are outside this MVP.

## Local setup

Use Node.js 22.12+ (tested here with Node.js 26) and PostgreSQL 16+. On PowerShell with restricted script execution, use `npm.cmd` in place of `npm`.

```sh
npm ci
```

For a **public preview**, leave `DATABASE_URL` unset and run `npm run dev`. Open http://localhost:5173. The API runs at http://127.0.0.1:4000. Preview vacancies are explicitly fictional; admin login and submissions remain disabled. This preview never stores candidate data.

For full functionality without Docker, open one terminal and run `npm run db:local`. This starts a private local PostgreSQL instance on port 5441. On first run, it creates `.env` with randomly generated database and administrator credentials; it never overwrites an existing `.env`. Keep that terminal running, then run `npm run db:deploy`, `npm run db:seed` and `npm run dev` in another terminal. Find your login email and password in `.env`. The database files and credentials stay in the ignored `.local-postgres` folder. This helper is for local development only.

Alternatively, copy `.env.example` to `.env` and configure an existing PostgreSQL connection and unique administrator credentials.

```sh
# Optional local PostgreSQL using Docker; set POSTGRES_PASSWORD first.
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

For Docker, use `postgresql://cosmic:YOUR_URL_ENCODED_PASSWORD@localhost:5432/cosmic_connect`. For an existing PostgreSQL server, create a database and supply its connection URL. The Docker service binds only to localhost and persists its data in a named volume.

Sign in at `/admin/login` using the environment-configured administrator credentials. There are no hardcoded or bypass credentials. Seed requires a unique password of at least twelve characters; it does not overwrite existing accounts or jobs. Sample candidates do not include CV files.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection; unset enables read-only public preview |
| `APP_URL` | Exact public browser origin for mutation checks; `http://localhost:5173` in development |
| `PORT` | Express API port, default 4000 |
| `NODE_ENV` | Set `production` for secure cookies and compiled frontend serving |
| `STORAGE_PROVIDER` | `local`; implement another adapter before selecting a cloud provider |
| `STORAGE_PATH` | Private document directory, default `.storage` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial administrator credentials, used only by the seed |
| `POSTGRES_PASSWORD` | Required by the optional Docker Compose database |
| `EMAIL_FROM`, `SMTP_URL` | Reserved for future notification integration; currently unused |

Authentication uses cryptographically random session tokens; only SHA-256 token hashes are stored in PostgreSQL. No token signing secret is needed. Passwords are hashed using bcrypt with cost 12. Sessions expire after eight hours and logout deletes the server-side session.

## Commands and database changes

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run db:migrate -- --name describe_your_change
npm run db:deploy
npm run db:seed
```

`db:migrate` creates development migrations after schema changes; commit the generated migration. `db:deploy` applies committed migrations to staging or production. The initial migration is included. Never seed fictional candidate data into a live recruitment database.

## Architecture

```text
src/components/     Shared branding, layout and UI primitives
src/pages/          Public and recruiter React screens
src/api.ts          Typed API client and loading/error state
src/lib/config.ts   Configurable job types, experience levels, statuses
src/lib/demo.ts     Fictional development vacancies
src/types.ts        Frontend data contracts
server/index.ts    Express API routes and application orchestration
server/auth.ts     Sessions, recruiter authorization, database rate limits
server/validation.ts  Zod validation and document signature checks
server/storage.ts  Private document storage adapter
scripts/           Local database helper, administrator provisioning, cleanup
prisma/            Relational schema, migrations and seed
tests/             Validation and API regression tests
```

React does not receive the Prisma client or database credentials. Public endpoints expose only job data. All recruiter APIs (including documents) require a valid database-backed session. CV keys use random UUIDs and are never served as static files. All user content is rendered as text rather than trusted HTML.

Candidates are associated by normalised email. Applying again to the same job is rejected by a database uniqueness constraint. An existing candidate profile is not overwritten by an unauthenticated submission. The CV attached to each application is retained separately. Updating candidate-entered details for an existing profile requires a future verified identity workflow.

The storage adapter can be replaced with S3, R2 or Supabase without changing the core application routes. CV parsing fields exist in the schema but no extraction is performed.

## Production deployment

1. Provision PostgreSQL and a private persistent storage volume or implement a cloud adapter.
2. Set `DATABASE_URL`, `APP_URL` to the HTTPS site origin, `NODE_ENV=production`, `PORT`, and storage settings. Use a secret manager for credentials.
3. Run `npm ci`, `npm run db:deploy`, and `npm run build`.
4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then run `npm run admin:provision`. This creates only the administrator and refuses to overwrite an existing account. Remove the administrator password from the runtime environment afterward. Do not seed the demo records into production.
5. Run `npm start`. Express serves `dist` and the API from the same origin. Place an HTTPS reverse proxy in front of the localhost-bound server.

Back up PostgreSQL and document storage together. Configure upload body limits at the reverse proxy. If forwarding client IPs, set Express `trust proxy` to the exact trusted proxy topology before relying on per-IP rate limiting; it is intentionally disabled by default. Schedule `npm run db:cleanup` to remove expired sessions and rate-limit records. Local storage needs a persistent disk and a single application instance; use object storage before deploying multiple replicas.

## Launch boundaries

- About, contact, privacy and terms are explicitly placeholder/draft content. Confirm company details, privacy notice, retention and rights request procedures before accepting live personal data.
- File size, extension, MIME and initial signature checks are implemented. They are not malware scanning; integrate antivirus/content scanning before broadly accepting production documents.
- Email confirmations, password recovery and recruiter account provisioning are not implemented. Administrator role is required for candidate deletion; both supported recruiter roles may manage vacancies and applications.
- The production server supplies job-specific metadata, canonical links and JobPosting JSON-LD for open vacancies. The body is client-rendered; prerendering can be added if organic search is a priority.
- Status history is transactional. Candidate deletion removes document files before the database record; storage failures leave the record available for retry.
- A dependency override pins `deepmerge-ts` to its patched major version for Prisma's development configuration dependency. Validate migrations when updating Prisma.

## Branding

The supplied artwork is displayed through an SVG viewport that crops the brand symbol from the original reference, without displaying the phone interface. The wordmark uses the requested **COSMIC CONNECT** name. Design tokens in `src/styles.css` use the provided navy palette. No external stock imagery or font CDN is required.

## Verification

Unit tests check candidate validation, consent, email/URL safety, document signatures/sizes, salary ranges and closed vacancy dates. Browser tests cover public filtering, empty states, mobile navigation, recruiter login, job publishing, candidate application, reference generation, status history, notes, duplicate rejection, authenticated document access, CSRF rejection, closing vacancies, data deletion and logout.

Run `npm exec -- playwright install chromium` once before browser tests. Start the local database, migrate, seed and run the development servers first. Database tests skip if no database credentials are configured. Browser tests add a fictional test vacancy and candidate, then delete the candidate and archive the test vacancy.

For the isolated local database, `npm exec -- tsx scripts/clean-test-fixtures.ts` removes archived automated-test vacancies that have no applications. The script refuses to run against another database.
#   C o s m i c - C o n n e c t  
 