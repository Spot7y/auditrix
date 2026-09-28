# Auditrix

Curriculum and prerequisite auditing for KSU-CEIT. Chairpersons keep each program's curriculum, register students
and record their grades; Auditrix checks every subject against its prerequisites and year-standing rules and shows
what each student has completed, can take next, or took out of order.

## Features

- **Student audit.** Every subject in a student's curriculum is marked Completed, Available, Pending, Unavailable
  or Violation, with the reason (e.g. the missing prerequisite).
- **Grade entry.** Chairpersons enter a term's grades at once. Only KSU grade values are accepted (1.0–3.0 passing,
  5.0 failing, INC, in progress). A grade entered before its prerequisites were passed is permanently flagged as
  invalid, and the subject must be retaken.
- **Curriculum management.** Versions per program (by effective year), subjects, prerequisites and year-standing
  requirements. Import from CSV with a preview of what will be added, changed or removed before anything is saved.
  Export to CSV or PDF.
- **Students.** Register one at a time or import a CSV or a KSU-MIS "Export to Excel" file.
- **Shifting, transfers and drops.** A chairperson releases a student who is shifting; the receiving program's
  chairperson accepts them into one of their curriculum versions. Transfers in and out and dropped students are
  recorded too, and every move is kept in the student's logbook.
- **Overview dashboard.** Per program: curriculum versions, students by year level and recent moves.
- **Deans.** The overview for every program in their college, plus creating programs and reassigning chairpersons.

## Roles

| Role        | Can                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Chairperson | Manage their program's curriculum and students, enter grades, record shifts, transfers and drops |
| Dean        | See their college's programs and students, create programs, reassign chairpersons                |

Access is enforced by Supabase row-level security. Actions that need the admin key (creating accounts, shift-ins)
check permissions in the server action and do their database writes in one transaction.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, server actions) with React 19 and Tailwind CSS 4
- [Supabase](https://supabase.com): Postgres, Auth and row-level security
- `@react-pdf/renderer` for the curriculum PDF export

## Getting started

Requirements: Node.js 20.9 or newer (22.3+ to run every test) and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root with your Supabase project's values (Project Settings → API):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SECRET_KEY=your-secret-key   # server only; never expose this to the browser
   ```

3. Apply the database migrations in `supabase/migrations`:

   ```bash
   npx supabase link          # once, to connect the CLI to your project
   npx supabase db push
   ```

   For a local Supabase instead, run `npx supabase start` and `npx supabase migration up`.

4. Optionally load the BSIT curriculum and a sample student:

   ```bash
   npx tsx scripts/seed-bsit.ts
   ```

5. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

Staff accounts are Supabase Auth users with a matching row in the `staff` table. Deans create chairperson accounts
from the app; the first dean account is created in Supabase Studio.

## Scripts

| Command                             | What it does                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                       | Start the development server                                           |
| `npm run build` / `npm start`       | Production build and server                                            |
| `npm run lint`                      | ESLint                                                                 |
| `npm test`                          | Run the automated tests                                                |
| `npx tsx scripts/seed-bsit.ts`      | Seed the BSIT curriculum and a sample student                          |
| `npx tsx scripts/check-supabase.ts` | Manual check of grade entry against the real database (uses seed data) |

## Testing

```bash
npm test
```

The tests use Node's built-in test runner and need no database or network:

- `lib/domain/__tests__/` — the audit rules (prerequisites, pending and invalid entries, year standing, completion),
  KSU grade validation, grade entry, subject-code matching, student ID format, and curriculum CSV import planning.
- `tests/actions/` — server actions with Supabase replaced by an in-memory fake: permission checks for deans and
  chairpersons, and ID validation when registering, importing and editing students. These need Node 22.3+ and are
  skipped on older versions.

## Project structure

```
app/                  Pages and server actions (Next.js App Router)
  (dashboard)/        Signed-in pages: home, students, curriculum, programs, settings
  login/              Sign-in page
components/           Shared UI (import dialog, feedback modal, password input)
lib/domain/           Audit engine, requirements, grade entry and import logic (no framework code)
lib/queries/          Data loading for pages
proxy.ts              Redirects signed-out visitors to /login
public/               CSV import templates
scripts/              Seed and maintenance scripts, test runner
supabase/migrations/  Database schema, row-level security policies and functions
tests/                Server action tests
```
