# Cosmic Connect Recruitment Portal

**Cosmic Connect** is a modular recruitment MVP consisting of a public-facing jobs website and a secure recruiter workspace.

The application is built with **React, TypeScript, Vite, Node.js, Express, Tailwind CSS, PostgreSQL and Prisma**.

It provides the core functionality required to advertise vacancies, receive candidate applications and allow recruiters to manage vacancies and applicants through an authenticated administration portal.

---

## Features

### Public recruitment website

- Responsive Cosmic Connect branding and navigation.
- Browse currently available vacancies.
- Search vacancies by keyword.
- Filter vacancies by:
  - Location
  - Job type
  - Experience level
- Dedicated vacancy detail pages.
- Candidate application form.
- General CV submission without requiring a candidate account.
- Candidate consent capture.
- CV file validation.
- Unique application reference numbers.
- Mobile-friendly responsive interface.

### Recruiter workspace

Authenticated recruiters can:

- View recruitment dashboard information.
- Create vacancies.
- Edit existing vacancies.
- Publish vacancies.
- Close vacancies.
- Archive vacancies.
- Duplicate existing vacancies.
- Search candidates and applications.
- View candidate profiles.
- View and download submitted CVs.
- Update application status.
- View application status history.
- Add private recruiter notes.
- Delete candidate records where administrator permissions allow.

### Security and data handling

- Server-side request validation.
- Database-backed authentication sessions.
- Cryptographically random session tokens.
- SHA-256 session token hashes stored in PostgreSQL.
- HTTP-only authentication cookies.
- Same-origin checks for state-changing requests.
- Persistent database-backed rate limiting.
- Password hashing with bcrypt using cost factor 12.
- Private CV/document storage.
- Random UUID-based document keys.
- CVs are never exposed as public static files.
- User-generated content is rendered as text rather than trusted HTML.
- File size, extension, MIME type and basic file-signature validation.

The development seed includes:

- 5 fictional vacancies.
- 10 fictional candidates.
- 15 fictional applications.

> Candidate accounts, AI CV parsing/ranking, email notifications, payments, interview scheduling and external integrations are intentionally outside the scope of this MVP.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- Zod

### Database

- PostgreSQL
- Prisma ORM

### Testing

- Unit and API regression tests
- Playwright browser testing

---

## Local Development

### Requirements

Install:

- **Node.js 22.12+**
- **PostgreSQL 16+**

The project has also been tested with Node.js 26.

On PowerShell systems with restricted script execution, use `npm.cmd` instead of `npm`.

Install dependencies:

```sh
npm ci
```

---

## Public Preview Mode

To run the application without configuring PostgreSQL, leave `DATABASE_URL` unset and start the development environment:

```sh
npm run dev
```

Open:

```text
http://localhost:5173
```

The Express API runs at:

```text
http://127.0.0.1:4000
```

Preview vacancies are explicitly fictional.

In preview mode:

- Recruiter authentication is disabled.
- Candidate applications are disabled.
- CV submissions are disabled.
- Candidate information is never stored.

This mode is intended only for safely previewing the public interface.

---

## Full Local Development

For full functionality without Docker, start the bundled local PostgreSQL helper:

```sh
npm run db:local
```

This starts a private PostgreSQL instance on:

```text
localhost:5441
```

On first run, the helper creates a `.env` file containing randomly generated:

- Database credentials.
- Administrator email.
- Administrator password.

An existing `.env` file is never overwritten.

Database files and local credentials are stored in:

```text
.local-postgres
```

This directory is ignored by Git.

Keep the database terminal running.

In another terminal, run:

```sh
npm run db:deploy
npm run db:seed
npm run dev
```

The recruiter login credentials can be found in `.env`.

Sign in at:

```text
/admin/login
```

> The local PostgreSQL helper is for development only.

---

## Using an Existing PostgreSQL Server

Copy:

```text
.env.example
```

to:

```text
.env
```

Then configure your PostgreSQL connection and unique administrator credentials.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/cosmic_connect
APP_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

Create the database before running migrations.

---

## Docker PostgreSQL

An optional Docker Compose configuration is included for PostgreSQL.

Set `POSTGRES_PASSWORD`, then run:

```sh
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Example connection URL:

```text
postgresql://cosmic:YOUR_URL_ENCODED_PASSWORD@localhost:5432/cosmic_connect
```

The PostgreSQL container binds only to localhost and stores database data in a named Docker volume.

---

## Administrator Account

Administrator credentials are configured through environment variables:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

There are no hardcoded or bypass credentials.

The seed requires a unique administrator password containing at least 12 characters.

Running the seed does not overwrite existing:

- User accounts.
- Vacancies.
- Application data.

Development candidate records are fictional and do not contain real CV files.

---

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL. Leaving it unset enables read-only public preview mode. |
| `APP_URL` | Exact browser origin used for same-origin mutation checks. |
| `PORT` | Express API port. Defaults to `4000`. |
| `NODE_ENV` | Set to `production` to enable secure cookies and compiled frontend serving. |
| `STORAGE_PROVIDER` | Document storage provider. Currently supports `local`. |
| `STORAGE_PATH` | Private document directory. Defaults to `.storage`. |
| `ADMIN_EMAIL` | Initial administrator email used during provisioning or development seed. |
| `ADMIN_PASSWORD` | Initial administrator password. |
| `POSTGRES_PASSWORD` | Password used by the optional Docker PostgreSQL service. |
| `EMAIL_FROM` | Reserved for future email integration. |
| `SMTP_URL` | Reserved for future email integration. |

`EMAIL_FROM` and `SMTP_URL` are currently unused.

---

## Authentication

Authentication uses opaque, database-backed sessions.

The system:

1. Generates a cryptographically secure random session token.
2. Sends the token using an HTTP-only cookie.
3. Stores only the SHA-256 hash of the token in PostgreSQL.
4. Expires sessions after eight hours.
5. Deletes the server-side session when the recruiter logs out.

No token-signing secret is required.

Passwords are hashed using bcrypt with a cost factor of 12.

---

## Available Commands

### Application

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

### Database

Create a development migration after changing the Prisma schema:

```sh
npm run db:migrate -- --name describe_your_change
```

Apply committed migrations:

```sh
npm run db:deploy
```

Seed development data:

```sh
npm run db:seed
```

Clean expired sessions and rate-limit records:

```sh
npm run db:cleanup
```

The initial database migration is included in the repository.

> Never seed fictional candidate data into a live recruitment database.

---

## Project Architecture

```text
src/
├── components/        Shared branding, layout and UI components
├── pages/             Public and recruiter React screens
├── api.ts             Typed API client and loading/error handling
├── lib/
│   ├── config.ts      Job types, experience levels and statuses
│   └── demo.ts        Fictional preview vacancies
└── types.ts           Frontend data contracts

server/
├── index.ts           Express API routes and application orchestration
├── auth.ts            Sessions, authorization and database rate limiting
├── validation.ts      Zod validation and document signature checks
└── storage.ts         Private document storage adapter

scripts/               Local database, provisioning and cleanup utilities
prisma/                Prisma schema, migrations and seed
tests/                 Validation and API regression tests
```

---

## Application Architecture

The frontend never receives the Prisma client or database credentials.

Public API endpoints expose only public vacancy data.

Recruiter-only APIs require a valid database-backed session, including access to:

- Candidate information.
- Applications.
- Recruiter notes.
- Status history.
- CV documents.

CV files are stored privately and referenced using random UUID identifiers.

They are never served directly as static public files.

---

## Candidate Data Behaviour

Candidates are associated using their normalised email address.

The same candidate cannot apply to the same vacancy twice because the database enforces an application uniqueness constraint.

When an existing candidate applies again for another vacancy:

- Their existing candidate profile is preserved.
- Unauthenticated submissions cannot silently overwrite existing profile data.
- Each application retains its own submitted CV reference.

Allowing candidates to update an existing verified profile would require a future identity verification workflow.

---

## Document Storage

The application currently provides a local private storage adapter.

The storage implementation can later be replaced with providers such as:

- Amazon S3
- Cloudflare R2
- Supabase Storage

The core recruitment routes do not need to change when replacing the storage implementation.

Fields for future CV parsing exist in the database schema, but no automated CV extraction or ranking is currently performed.

---

## Production Deployment

### 1. Provision infrastructure

Provision:

- PostgreSQL.
- Private persistent document storage.

For multi-instance deployments, use object storage rather than local disk.

### 2. Configure environment variables

Set:

```env
DATABASE_URL=
APP_URL=https://your-domain.example
NODE_ENV=production
PORT=4000
STORAGE_PROVIDER=local
STORAGE_PATH=/private/storage/path
```

Use a secrets manager for sensitive production credentials.

### 3. Install and build

```sh
npm ci
npm run db:deploy
npm run build
```

### 4. Provision the administrator

Set:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Then run:

```sh
npm run admin:provision
```

The command:

- Creates only the administrator account.
- Refuses to overwrite an existing administrator.

Remove `ADMIN_PASSWORD` from the runtime environment after provisioning.

Do not run the development seed in production.

### 5. Start the application

```sh
npm start
```

In production, Express serves both:

- The compiled frontend from `dist`.
- The API.

Place an HTTPS reverse proxy in front of the localhost-bound application server.

---

## Production Considerations

### Backups

Back up PostgreSQL and document storage together so that database records and uploaded files remain consistent.

### Upload limits

Configure request and upload body limits at the reverse proxy as well as within the application.

### Reverse proxy configuration

If forwarding real client IP addresses, configure Express `trust proxy` only for the exact trusted proxy topology.

It is intentionally disabled by default.

Do not enable unrestricted proxy trust before relying on per-IP rate limiting.

### Session cleanup

Schedule:

```sh
npm run db:cleanup
```

to remove expired:

- Authentication sessions.
- Rate-limit records.

### Scaling

Local document storage requires:

- Persistent disk.
- A single application instance.

Use object storage before running multiple application replicas.

---

## Launch Boundaries

Before accepting real candidate information in production, complete the following items.

### Legal and company information

The current:

- About page.
- Contact page.
- Privacy policy.
- Terms and conditions.

contain placeholder or draft information.

Confirm:

- Company details.
- Privacy notice.
- Candidate data retention periods.
- Candidate rights procedures.
- Data deletion procedures.
- Contact information.

before processing live recruitment data.

### Document security

The system currently validates:

- File size.
- Extension.
- MIME type.
- Initial file signature.

These checks are not a replacement for malware scanning.

Integrate antivirus or content scanning before accepting documents at production scale.

### Email and account functionality

The MVP does not currently provide:

- Candidate email confirmations.
- Recruiter password recovery.
- Self-service recruiter registration.
- Automated recruiter invitations.

### Recruiter permissions

Both supported recruiter roles can manage:

- Vacancies.
- Applications.

Administrator permission is required for permanent candidate deletion.

### Search engine optimisation

The production server provides:

- Job-specific metadata.
- Canonical URLs.
- `JobPosting` JSON-LD for open vacancies.

The application body remains client rendered.

Server-side rendering or prerendering can be introduced later if organic search visibility becomes a priority.

---

## Data Integrity

Application status history updates are transactional.

Candidate deletion removes associated document files before deleting the database candidate record.

If document storage deletion fails, the database record remains available so the deletion can be retried safely.

---

## Dependency Management

A dependency override pins `deepmerge-ts` to a patched major release required by Prisma's development configuration dependency.

When upgrading Prisma or related dependencies:

```sh
npm run typecheck
npm test
npm run build
```

Also validate existing and newly generated migrations before deployment.

---

## Branding

The supplied Cosmic Connect artwork is displayed through an SVG viewport that crops the brand symbol from the original reference artwork without displaying the phone interface.

The interface uses:

- The **COSMIC CONNECT** wordmark.
- The supplied navy colour palette.
- Design tokens defined in `src/styles.css`.

The project does not depend on external stock imagery or a font CDN.

---

## Testing and Verification

Unit tests cover areas including:

- Candidate validation.
- Candidate consent.
- Email validation.
- URL safety.
- Document signatures.
- Upload size restrictions.
- Salary ranges.
- Closed vacancy dates.

Browser tests cover:

- Public vacancy filtering.
- Empty states.
- Mobile navigation.
- Recruiter authentication.
- Vacancy creation and publishing.
- Candidate applications.
- Application reference generation.
- Application status history.
- Private recruiter notes.
- Duplicate application rejection.
- Authenticated CV access.
- Same-origin/CSRF rejection.
- Closing vacancies.
- Candidate deletion.
- Recruiter logout.

Install Playwright Chromium once:

```sh
npm exec -- playwright install chromium
```

Before running browser tests:

1. Start the local database.
2. Apply migrations.
3. Seed the development database.
4. Start the development servers.

Then run:

```sh
npm run test:e2e
```

Database-dependent tests are skipped when database credentials are unavailable.

Browser tests create fictional automated-test vacancies and candidates, then remove the test candidate and archive the test vacancy.

---

## Cleaning Automated Test Fixtures

For the isolated local database, run:

```sh
npm exec -- tsx scripts/clean-test-fixtures.ts
```

This removes archived automated-test vacancies that have no associated applications.

The script contains safeguards and refuses to run against another database.

---

## MVP Scope

### Included

- Public vacancy website.
- Vacancy search and filtering.
- Candidate job applications.
- General CV submission.
- Recruiter authentication.
- Vacancy management.
- Candidate and application management.
- Application workflow/status management.
- Recruiter notes.
- Private CV access.
- Role-based candidate deletion.
- Database-backed session security.
- Persistent rate limiting.
- Automated testing.

### Future Enhancements

Potential future improvements include:

- Candidate accounts.
- Candidate profile editing.
- AI-assisted CV parsing.
- Candidate ranking and matching.
- Email notifications.
- Password recovery.
- Recruiter invitation workflows.
- Interview scheduling.
- Calendar integrations.
- Cloud/object document storage.
- Antivirus document scanning.
- Recruitment analytics.
- Advanced role and permission management.
- Server-side rendering or prerendering.

---

## Development Data

All vacancies, candidates and applications included in the development seed are fictional.

Development data must never be used as real recruitment information or seeded into a live production recruitment database.

---

## License

Add the appropriate project licence before public distribution or reuse.
