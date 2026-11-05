# GRA E-Voting Management System

A Next.js application foundation for managing organization elections. PostgreSQL and Prisma are the planned data layer.

## Current foundation

- Next.js App Router with the existing TypeScript, Tailwind CSS, Shadcn Nova, Base UI, and Lucide setup.
- The supplied Ghana Revenue Authority HOTSC | GRA logo is used across voter and administrator portals, with the seal as the application icon.
- Separate voter and administrator portal components in `components/voters_portal.tsx` and `components/admin_portal.tsx`.
- `/` redirects to `/vote`. `/admin` requires an authenticated administrator session in every environment. Administrator sign-in uses the `ADMIN_USERNAME` and `ADMIN_PASSWORD` values configured in the server environment; there is no public administrator sign-up.
- `/admin/eligibility` accepts an election-specific `.xlsx` roster. Required columns are `Name` and `Phone Number`; `Email` and `Department` are optional. Name and phone together form the keyed identity lookup. Phone values must be formatted as text in Excel to preserve leading zeroes.
- Published elections with positions accept public nominee applications. Applicant contact details are encrypted, optional profile photos are validated and optimized before database storage, applications remain pending until an administrator reviews them in `/admin`, and only approved nominees appear in the voter portal. Pending photos are administrator-only. Since nominee sign-in is not implemented, administrators must independently verify applicant identity and eligibility before approval.
- Eligibility uploads add or restore election assignments; they do not revoke people who are absent from later uploads. Each upload is validated and committed atomically, personal values are encrypted, and import/audit records retain counts and row numbers rather than spreadsheet values.
- Prisma schema for administrators, encrypted voter details, election-specific eligibility, candidates, imports, audit events, participation, and ballots.
- Server-only Prisma client in `lib/prisma.ts`.
- `.env.example` contains a placeholder connection URL; it is not a working credential.

## Data model

- `User`, `AdminSession`, `AdminLoginAttempt`: encrypted administrator profiles, hashed passwords/session tokens, and per-account login lockouts.
- `Voter`, `VoterVerification`: encrypted voter profile fields, keyed identifier lookup, and hashed verification challenges.
- `Election`, `Position`, `Candidate`: election configuration, candidate applications, encrypted applicant contact details, administrator decisions, and the candidate/position relationship.
- `ElectionVoter`, `CredentialIssuance`, `VoteParticipation`: per-election eligibility, identity-side credential issuance status, and participation tracking.
- `Ballot`, `BallotSelection`: anonymous credential digests and selections, with no voter or eligibility foreign key.
- `DatasetImport`, `DatasetImportRecord`: import summaries and row outcomes without retaining raw spreadsheet values.
- `AuditLog`: administrative/security event records; append-only database permissions or triggers still need to be configured.

## Database setup

1. Choose a PostgreSQL provider and create a development database.
2. Copy `.env.example` to `.env.local` and replace the placeholder `DATABASE_URL` with the provider's development connection URL.
3. Generate the Prisma client with `npm run db:generate`.
4. Validate the schema with `npm run db:validate`.
5. After reviewing the schema against the configured development database, create a migration with `npm run db:migrate`.
6. Apply checked-in migrations to the selected database with `npx prisma migrate deploy`.

Do not use production credentials for local development or commit `.env.local`.

## Administrator access and roster imports

1. Configure `ADMIN_USERNAME` and a long random `ADMIN_PASSWORD` in the local, ignored environment file. Also configure independent random values of at least 32 bytes for `SESSION_SECRET` and `APP_ENCRYPTION_KEY`. Do not reuse or commit credentials or secrets.
2. Apply the database migrations and generate the Prisma client.
3. Sign in at `/admin/login` with the environment-configured username and password. The application creates the administrator's database-backed session account on first successful sign-in; `/admin/setup` redirects to sign-in.
4. Open **Eligibility & imports**. Download the workbook template, select an election that has not opened, and upload the completed file.

Uploads accept `.xlsx` files up to 5 MB and 5,000 voter rows. Rejected and duplicate rows are reported without displaying personal values. A failed database transaction commits no partial roster. The supplied name/phone pair is encrypted and keyed-hashed for matching; changing either value produces a different identity key.

Importing eligibility or approving a nominee does not enable voter sign-in or ballot submission. Those workflows must still enforce the election-specific `ElectionVoter` assignment and require a separately reviewed anonymous-ballot protocol before any live election.

## Ballot privacy status

The schema deliberately has no voter or eligibility foreign key on `Ballot` or `BallotSelection`. Eligibility-side participation and anonymous ballots are stored separately. This structural separation does **not** by itself guarantee ballot anonymity. Anonymous credential issuance and verification require a mature, independently reviewed protocol; that mechanism is not implemented, so this foundation is not ready to conduct a real election.

Voter identification, contact, and name fields are encrypted, with a separate keyed lookup hash for identities. Keep the encryption key stable and back it up securely; rotating it requires a planned data re-encryption and lookup-hash migration.
