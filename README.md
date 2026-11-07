# GRA E-Voting Management System

A Next.js application foundation for managing organization elections. PostgreSQL and Prisma are the planned data layer.

## Current foundation

- Next.js App Router with the existing TypeScript, Tailwind CSS, Shadcn Nova, Base UI, and Lucide setup.
- The supplied Ghana Revenue Authority HOTSC | GRA logo is used across voter and administrator portals, with the seal as the application icon.
- Separate voter and administrator portal components in `components/voters_portal.tsx` and `components/admin_portal.tsx`.
- `/` redirects to `/vote`. `/admin` requires an authenticated administrator session in every environment. Administrator sign-in uses the `ADMIN_USERNAME` and `ADMIN_PASSWORD` values configured in the server environment; there is no public administrator sign-up.
- `/admin/eligibility` accepts a voter-name `.xlsx` roster. The only required/imported column is `Name`; any other columns are ignored. Repeated normalized names are treated as the same person and skipped. Imported voters are assigned to all current open/upcoming elections and automatically assigned when future elections are created. Closed elections are not changed.
- From `/admin/elections`, administrators can publish positions for nominations before setting voting dates. Candidates choose a position on the voter nomination form; applications remain pending until an administrator reviews them. Administrators can then set opening and closing times in `Africa/Accra`; saving the schedule moves the draft cycle to scheduled. Additional positions can be added through **Manage nomination positions**. The application synchronizes scheduled election statuses when election pages or actions are accessed.
- Elections with positions accept public nominee applications at any time, including after voting opens or closes. Applicant contact details are encrypted, optional profile photos are validated and optimized before database storage, applications remain pending until an administrator reviews them in `/admin`, and only approved nominees appear in the voter portal. Approved applications remain available in the administrator nomination archive after review. Pending photos are administrator-only. Since nominee sign-in is not implemented, administrators must independently verify applicant identity and eligibility before approval.
- Name-only eligibility uploads add or restore assignments across current open/upcoming elections; future elections include all active registered voters. They do not revoke people who are absent from later uploads. Repeated normalized names are deduplicated. Each upload is validated and committed atomically, voter names are encrypted, and import/audit records retain counts and row numbers rather than spreadsheet values.
- Prisma schema for administrators, encrypted voter details, election-specific eligibility, candidates, imports, audit events, participation, and ballots.
- Server-only Prisma client in `lib/prisma.ts`.
- `.env.example` contains a placeholder connection URL; it is not a working credential.

## Data model

- `User`, `AdminSession`, `AdminLoginAttempt`: encrypted administrator profiles, hashed passwords/session tokens, and per-account login lockouts.
- `Voter`: encrypted voter profile fields and keyed identifier lookup.
- `Election`, `Position`, `Candidate`: election configuration, candidate applications, encrypted applicant contact details, administrator decisions, and the candidate/position relationship.
- `ElectionVoter`, `VoteParticipation`: per-election eligibility and participation tracking for the shared voter registry.
- `Ballot`, `BallotSelection`: anonymous credential digests and selections, with no voter or eligibility foreign key.
- `DatasetImport`, `DatasetImportRecord`: import summaries and row outcomes without retaining raw spreadsheet values.
- `AuditLog`: administrative/security event records; append-only database permissions or triggers still need to be configured.

## Database setup

1. Choose a PostgreSQL provider and create a development database.
2. Copy `.env.example` to `.env.local` and replace the placeholder `DATABASE_URL` with the provider's development connection URL. If the provider supplies a direct connection URL separately, set `DIRECT_URL`; local development uses it for Prisma, while production continues to use `DATABASE_URL`.
3. Generate the Prisma client with `npm run db:generate`.
4. Validate the schema with `npm run db:validate`.
5. After reviewing the schema against the configured development database, create a migration with `npm run db:migrate`.
6. Apply checked-in migrations to the selected database with `npx prisma migrate deploy`.

Do not use production credentials for local development or commit `.env.local`.

## Administrator access and roster imports

1. Configure `ADMIN_USERNAME` and a long random `ADMIN_PASSWORD` in the local, ignored environment file. Also configure independent random values of at least 32 bytes for `SESSION_SECRET` and `APP_ENCRYPTION_KEY`. Do not reuse or commit credentials or secrets.
2. Apply the database migrations and generate the Prisma client.
3. Sign in at `/admin/login` with the environment-configured username and password. The application creates the administrator's database-backed session account on first successful sign-in; `/admin/setup` redirects to sign-in.
4. Open **Eligibility & imports**, download the workbook template, and upload a spreadsheet containing voter names. Registered voters are assigned to all current open/upcoming elections and any elections created later; no election selection is required. In **Voting setup**, publish nomination positions first so candidates can apply and be reviewed, then save the opening and closing times before voting begins.

Uploads accept `.xlsx` files up to 5 MB and 5,000 voter rows. Only the `Name` column is imported; any other columns are ignored. Rejected and duplicate rows are reported without displaying personal values. A failed database transaction commits no partial import. Normalized names are keyed-hashed for matching.

## Testing the nomination form

Use a dedicated development/test database; never point `TEST_DATABASE_URL` at production or a database containing real election data. Sign in to the test app once so it has an administrator, then set `TEST_DATABASE_URL` to that test database and `ALLOW_TEST_DATA=YES` in `.env.local`. Run `npm run db:seed:test` from the application directory to create or refresh a clearly labeled `[TEST DATA]` election with President, Vice President, and Secretary positions. Test submissions are accepted before, during, and after the election and appear in administrator **Nomination review**.

Run `npm run db:delete:test` with the same test database and confirmation to remove that election and its associated test records. Audit history and voter records are retained. The test scripts refuse to run under `NODE_ENV=production` and only connect through `TEST_DATABASE_URL`.

Scheduled status changes are request-driven rather than run by a background scheduler. If the application receives no requests at the opening or closing time, the persisted status is synchronized on the next access; time-window checks still use the current time. Importing eligible voters or approving a nominee does not enable voter sign-in or ballot submission. Those workflows must still enforce the election-specific `ElectionVoter` assignment and require a separately reviewed anonymous-ballot protocol before any live election.

## Ballot privacy status

The schema deliberately has no voter or eligibility foreign key on `Ballot` or `BallotSelection`. Eligibility-side participation and anonymous ballots are stored separately. This structural separation does **not** by itself guarantee ballot anonymity. Anonymous credential issuance and verification require a mature, independently reviewed protocol; that mechanism is not implemented, so this foundation is not ready to conduct a real election.

Voter identification, contact, and name fields are encrypted, with a separate keyed lookup hash for identities. Keep the encryption key stable and back it up securely; rotating it requires a planned data re-encryption and lookup-hash migration.
