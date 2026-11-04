# GRA E-Voting Management System

A Next.js application foundation for managing organization elections. PostgreSQL and Prisma are the planned data layer.

## Current foundation

- Next.js App Router with the existing TypeScript, Tailwind CSS, Shadcn Nova, Base UI, and Lucide setup.
- Separate voter and administrator portal components in `components/voters_portal.tsx` and `components/admin_portal.tsx`.
- `/` redirects to `/vote`, which renders the voter portal. The administrator dashboard component is not rendered on a public route; `/admin` remains a restricted placeholder until authentication and server-side authorization exist.
- Prisma schema for administrators, encrypted voter details, election-specific eligibility, candidates, imports, audit events, participation, and ballots.
- Server-only Prisma client in `lib/prisma.ts`.
- `.env.example` contains a placeholder connection URL; it is not a working credential.

## Data model

- `User`, `AdminSession`: administrator accounts and hashed session tokens.
- `Voter`, `VoterVerification`: encrypted voter profile fields, keyed identifier lookup, and hashed verification challenges.
- `Election`, `Position`, `Candidate`: election configuration and the candidate/position relationship.
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

Do not use production credentials for local development or commit `.env.local`.

## Ballot privacy status

The schema deliberately has no voter or eligibility foreign key on `Ballot` or `BallotSelection`. Eligibility-side participation and anonymous ballots are stored separately. This structural separation does **not** by itself guarantee ballot anonymity. Anonymous credential issuance and verification require a mature, independently reviewed protocol; that mechanism is not implemented, so this foundation is not ready to conduct a real election.

Voter identification, contact, and name fields are represented as ciphertext, with a separate lookup-hash field for identifiers. Encryption, key management, and keyed lookup implementation remain to be designed and reviewed before importing real voter data.
