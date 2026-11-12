# GRA E-Voting Management System

A Next.js application foundation for managing organization elections. PostgreSQL and Prisma are the planned data layer.

## Current foundation

- Next.js App Router with the existing TypeScript, Tailwind CSS, Shadcn Nova, Base UI, and Lucide setup.
- The supplied Ghana Revenue Authority HOTSC | GRA logo is used across voter and administrator portals, with the seal as the application icon.
- Separate voter and administrator portal components in `components/voters_portal.tsx` and `components/admin_portal.tsx`.
- `/` redirects to `/vote`. `/admin` requires an authenticated administrator session in every environment. Administrator sign-in uses the `ADMIN_USERNAME` and `ADMIN_PASSWORD` values configured in the server environment; there is no public administrator sign-up.
- `/admin/eligibility` accepts an `.xlsx` roster with required `Name` and `Phone Number` columns (`Phone` is also accepted). Other columns are ignored. Phone numbers are normalized for matching, encrypted at rest, and keyed-hashed for exact matching; each phone number must belong to only one roster entry. Repeated normalized names are treated as the same person. An administrator can update an existing voter's phone by importing the updated roster row. Imported voters are assigned to all current open/upcoming elections and automatically assigned when future elections are created. Closed elections are not changed.
- From `/admin/elections`, administrators can publish positions for candidate applications before setting voting dates. Candidates choose a position on the candidate application form; applications remain pending until an administrator reviews them. Administrators can then set opening and closing times in `Africa/Accra`; saving the schedule moves the draft cycle to scheduled. Additional positions can be added through **Manage positions for candidate applications**. The application synchronizes scheduled election statuses when election pages or actions are accessed.
- Administrators may permanently delete scheduled or closed elections. Deleting a closed election also deletes its ballots, selections, participation records, candidates, positions, and eligibility assignments; a deletion audit entry retains the election title, prior status, and activity counts only. The admin confirmation warns about the irreversible removal.
- The voter results page displays aggregate candidate vote totals during open elections and refreshes them every 10 seconds while visible. After polls close, it retains final totals and shows the winner or a tie for each position. Live leaders are labeled as current leaders rather than final winners.
- Elections with positions accept multiple candidate applications for the same position at any time, including before voting is scheduled and after voting opens or closes. Applicant contact details are encrypted, optional profile photos are validated and optimized before database storage, applications remain pending until an administrator reviews them in `/admin/candidates`, and approved candidates remain visible in the voter portal even after their election closes or is archived. The ballot lists every approved candidate for a position while allowing each voter one selection per position. An explicit election deletion removes that election's candidates; administrators can also remove an approved candidate. Approved applications remain available in the administrator candidate review archive after review. Pending photos are administrator-only. Since candidate sign-in is not implemented, administrators must independently verify applicant identity and eligibility before approval.
- Eligibility uploads add or restore assignments across current open/upcoming elections; future elections include all active registered voters. They do not revoke people who are absent from later uploads. Repeated normalized names are deduplicated. Each upload is validated and committed atomically, voter names and phone numbers are encrypted, and import/audit records retain counts and row numbers rather than spreadsheet values.
- Prisma schema for administrators, encrypted voter details, election-specific eligibility, candidates, imports, audit events, participation, and ballots.
- Server-only Prisma client in `lib/prisma.ts`.
- `.env.example` contains a placeholder connection URL; it is not a working credential.

## Data model

- `User`, `AdminSession`, `AdminLoginAttempt`: encrypted administrator profiles, hashed passwords/session tokens, and per-account login lockouts.
- `Voter`: encrypted voter profile fields and keyed identifier lookup.
- `Election`, `Position`, `Candidate`: election configuration, candidate applications, encrypted applicant contact details, administrator decisions, and the candidate/position relationship.
- `ElectionVoter`: per-election eligibility plus the keyed digest and rate-limit state for the election-specific voter ID.
- `VoteParticipation`: per-position participation tracking, stored separately from candidate selections.
- `Ballot`, `BallotSelection`: random ballot digests and candidate selections, with no voter or eligibility foreign key.
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
2. Apply database migrations with `npx prisma migrate deploy` and generate the Prisma client before starting the application.
3. Sign in at `/admin/login` with the environment-configured username and password. The application creates the administrator's database-backed session account on first successful sign-in; `/admin/setup` redirects to sign-in. Admin sessions persist across browser restarts and application refreshes and remain valid until sign-out, account deactivation, or session revocation. Session verification uses the persistent database record and active account status, rather than rechecking login credentials or encryption settings on each request. Database sessions use a far-future expiry, and the persistent browser cookie is configured for up to 400 days, subject to browser cookie policies. Sessions created before token hashes were made independent of `SESSION_SECRET` may require one sign-in if that secret was changed. Keep `APP_ENCRYPTION_KEY` stable to preserve access to encrypted application data. The session migration extends existing active sessions.
4. Keep `BALLOTING_ENABLED=false` until the implementation has been independently reviewed and end-to-end tested. Open **Eligibility & imports**, download the workbook template, and upload a spreadsheet containing each voter's name and unique phone number. Use the same phone format consistently in the roster and voter access form. Registered voters are assigned to all current open/upcoming elections and any elections created later; no election selection is required. In **Voting setup**, publish positions first so candidates can apply and be reviewed, then save the opening and closing times before voting begins.

Uploads accept `.xlsx` files up to 5 MB and 5,000 voter rows. The `Name` and `Phone Number` columns are imported; `Phone` is also accepted, and any other columns are ignored. Rejected and duplicate rows are reported without displaying personal values. A failed database transaction commits no partial import. Normalized names and phone numbers are keyed-hashed for matching.

## Testing the candidates form

Use a dedicated development/test database; never point `TEST_DATABASE_URL` at production or a database containing real election data. Sign in to the test app once so it has an administrator, then set `TEST_DATABASE_URL` to that test database and `ALLOW_TEST_DATA=YES` in `.env.local`. Run `npm run db:seed:test` from the application directory to create or refresh a clearly labeled `[TEST DATA]` election with President, Vice President, and Secretary positions. Test submissions are accepted before, during, and after the election and appear in administrator **Candidate review**.

Run `npm run db:delete:test` with the same test database and confirmation to remove that election and its associated test records. Audit history and voter records are retained. The test scripts refuse to run under `NODE_ENV=production` and only connect through `TEST_DATABASE_URL`.

Scheduled status changes are request-driven rather than run by a background scheduler. If the application receives no requests at the opening or closing time, the persisted status is synchronized on the next access; time-window checks still use the current time. During an open election, `/vote` matches the voter's name and phone against the imported roster and generates one unique, election-specific voter ID on the first successful verification. The ID is encrypted at rest and its keyed digest is used for ballot authentication; later successful verifications recover the same ID rather than issuing another. The voter is directed to `/vote/ballot`, where the ID is displayed and a short-lived HttpOnly cookie carries the credential into the ballot session. If the browser session is unavailable, the voter can enter their saved ID manually. A separate participation ledger and a transaction constraint prevent another vote for the same position while allowing later votes for other positions. The page and server actions remain disabled unless `BALLOTING_ENABLED=true`; do not enable it for a live election until the flow has been independently security-reviewed and tested end to end.

## Ballot privacy status

The schema deliberately has no voter or eligibility foreign key on `Ballot` or `BallotSelection`. Eligibility-side participation is recorded separately for each position, while each ballot stores a randomly generated digest that is not derived from the voter ID. This structural separation does **not** guarantee ballot anonymity: timestamps and database access can make participation and ballot rows correlatable. The design has not been independently reviewed and is not ready to conduct a real election.

Voter identification, contact, and name fields are encrypted, with a separate keyed lookup hash for identities. Keep the encryption key stable and back it up securely; rotating it requires a planned data re-encryption and lookup-hash migration.
