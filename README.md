# Auditrix

Curriculum and prerequisite auditing for KSU colleges. Chairpersons keep each program's curriculum, register students
and record their grades; Auditrix checks every subject against its prerequisites and year-standing rules and shows
what each student has completed, can take next, or took out of order.

## Features

- **Student audit.** Every subject in a student's curriculum is marked Completed, Available, Pending, Unavailable
  or Violation, with the reason (e.g. the missing prerequisite).
- **Grade entry.** Chairpersons enter a term's grades at once. Only KSU grade values are accepted (1.0–3.0 passing,
  5.0 failing, INC); a subject is recorded only once it has a grade. Choosing the curriculum semester also sets the
  term's semester (midyear is S); the school year starts empty and must be typed, so grades can't be saved to a term
  by accident. A retake with the same grade (e.g. 5.0 again a semester later) is saved as a new attempt. A final grade
  for an INC keeps the subject in its original term and records the term the INC was resolved in. Only the latest
  attempt of a subject is kept, so a grade from an earlier term than the recorded one is refused unless the
  chairperson confirms it corrects a wrong term.
- **Prerequisite checking by term.** Terms are written as on KSU records: `25-1`, `25-2`, and for the
  midyear `26-S`, which carries the year of the semester after it (25-2 → 26-S → 26-1). A
  prerequisite must be passed in a term *before* the subject was taken; the same term is a violation, and so is taking
  a subject while its prerequisite is still INC. Co-requisites must be taken in the same term and both passed; if one
  fails, both are retaken. A subject taken out of order earns no credit, so it doesn't count toward later subjects
  either. Because everything is worked out from the terms, grades can be entered in any order.
- **Year standing at the time taken.** A year-standing requirement is met by being on that year level (see below).
  For a subject already taken, it's the year level going into that term, counting only what was passed before it.
  When nothing was recorded for that term and the grades alone don't show the standing, the subject is marked
  "Year standing: please verify" instead of a violation.
- **Curriculum management.** Versions per program (by effective year), subjects, prerequisites and year-standing
  requirements. Import from an Excel (.xlsx or .xls) or CSV file with a preview of what will be added, changed or removed before anything is saved.
  Export to CSV or PDF. Every edit is kept in a per-version change history (who changed what, and when). A version
  is locked once any student is registered on it: its subjects and requirements can't be changed (the database
  refuses it too), so students' audits don't change under them. An edited curriculum is a new version, which starts
  as a copy of the latest one.
- **Students.** Register one at a time or import an Excel (.xlsx or .xls) or CSV file (the template, or KSU-MIS's
  "Export to Excel"). Files in the old Excel 97–2003 format need to be saved again as .xlsx or CSV first. The student
  list can be searched and filtered by year level, curriculum version and status (regular, irregular, not determined,
  with violations, dropped or transferred out), and shows the reason under each name: the subjects taken out of
  order, the prescribed subjects an irregular student isn't enrolled in, or that nothing is recorded this semester.
- **Current semester and year levels.** The dean sets the college's current semester; grade entry starts on it.
  A student's year level follows what they've finished in their curriculum, per the KSU Operations Manual: 25% of the
  units for 2nd year, more than 50% for 3rd year, 75% for 4th year, or every subject of the earlier years. Only
  subjects passed before the current semester count, so students move up when the dean moves to a new semester. The
  year level given at registration or import is kept until the grades show more, and a chairperson can set a
  student's year level by hand for a special case (and set it back to automatic) from their Edit page.
- **Shifting, transfers and drops.** A chairperson releases a student who is shifting; the receiving program's
  chairperson accepts them into one of their curriculum versions. Transfers in and out and dropped students are
  recorded too, and every move is kept in the student's logbook. The Student Movements page lists every shift,
  transfer, drop and reopening in your scope, with a search and filters by type, program and year. A dropped or transferred-out student's record is
  locked: their grades, details and year level can't be changed (the database refuses it too) until a chairperson
  reopens the record, which is also kept in the history.
- **Regular and irregular students.** Per the KSU Operations Manual, a student is regular when enrolled this semester
  in the full prescribed load (the curriculum's subjects for their year level and the current semester, not counting
  ones already passed) and irregular when enrolled in less. Back subjects on top of a full load don't change that.
  Until the current semester's grades are entered, the status is "not determined" and the student isn't counted,
  except for first-year students: they take the full first-year load, so they count as regular until their grades
  for the semester are in; from then on their grades decide.
- **Overview dashboard.** A "Needs attention" banner lists what to look at first (students with violations, a
  semester that isn't set), with links to those students. Per program: totals with percentages, and charts of
  regular/irregular/not determined, students by year level and the subjects most often taken out of order. Every chart shows its numbers on
  hover and can be opened as a table. Dropped and transferred-out students aren't counted as current students. A dean
  with several programs sees them compared side by side (regular/irregular share and violations per program) and in
  a table, and picks a program to see its charts.
- **Everywhere.** The top bar shows the college's current semester and, for chairpersons, a student search (Ctrl+K
  from any page); the sidebar shows how many students the program has. Curriculum versions can be viewed one semester at a time.
- **Deans.** The overview for every program in their college, plus creating programs and reassigning chairpersons.
  New chairpersons must replace the temporary password their dean set when they first log in; a checklist under the
  field ticks each password rule green as it's met.
- **Safeguards.** Actions that are hard to undo (dropping a student, deleting a subject, replacing a chairperson,
  saving grades) ask for confirmation first, and every result is shown as a notification.

## Security

- **Access by role, checked three times.** Every page checks the user's role (a chairperson can't open a dean's
  page by typing its address, and the other way around), every server action checks it again, and PostgreSQL
  row-level security limits each chairperson to their program and each dean to their college.
- **The database keeps the history.** Grade changes are written to the grade logbook by a database trigger, with the
  signed-in user's name and the server's time; nobody can write, change or delete logbook entries directly. Student
  movements and curriculum changes are stamped the same way. Grades must be KSU grades that match their status, and
  terms must look like `25-1` or `26-S`.
- **Accounts.** Passwords are stored by Supabase Auth as bcrypt hashes and must have 8+ characters with a letter and a
  number. After 5 wrong passwords an account is blocked for 15 minutes, and users are signed out after 30 minutes
  without activity (with a minute's warning). New chairpersons must replace their temporary password.
- **Browser protections.** A Content Security Policy, no framing by other sites (clickjacking), `nosniff`, a strict
  referrer policy and, in production, HSTS. Technical database errors are logged on the server, not shown.
- **Locked records.** A dropped or transferred-out student's record can't be changed until it's reopened.

**Running it on a laptop:** the local Supabase listens on the whole network with well-known default keys, and its
Studio has no password. Before using Auditrix on a shared network (e.g. school Wi-Fi), block those ports from other
computers. In PowerShell **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Auditrix: block local Supabase from the network" -Direction Inbound -Protocol TCP -LocalPort 54321-54324 -Action Block
```

Auditrix itself keeps working on the laptop (`localhost`). To let other devices use it, prefer
`npm run dev:https` (encrypted, with a self-signed certificate the browser will warn about) over plain `npm run dev`,
which sends passwords and grades over the network unencrypted. For real use, host it (e.g. Supabase cloud and an HTTPS
host) with your own keys and a strong database password.

The backup file from `npm run db:save` (`supabase/seed.sql`) holds every record and the password hashes; keep it
private. `.env.local` holds the secret key, which bypasses all of the above; never share it.

## Roles

| Role        | Can                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Chairperson | Manage their program's curriculum and students, enter grades, record shifts, transfers and drops |
| Dean        | See their college's programs (totals, charts, student movements), set the current semester, create programs, reassign chairpersons. Individual students' records are for chairpersons only. |

Access is enforced by Supabase row-level security. Actions that need the admin key (creating accounts, shift-ins)
check permissions in the server action and do their database writes in one transaction.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, server actions) with React 19 and Tailwind CSS 4 (Inter font, KSU green theme)
- [Supabase](https://supabase.com): Postgres, Auth and row-level security
- `@react-pdf/renderer` for the curriculum PDF export, ExcelJS for reading .xlsx imports, and Lucide for icons

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

   For a local Supabase instead, run `npx supabase start` and `npx supabase migration up --local`.

   `supabase/rollbacks/` holds SQL that undoes a feature's migration, for when that feature is taken out again.

   To keep the data you've entered through a reset of the local database, save it first:

   ```bash
   npm run db:save            # writes everything (accounts, curricula, students, grades) to supabase/seed.sql
   npx supabase db reset      # rebuilds the database, then loads supabase/seed.sql
   ```

   Run `npm run db:save` again whenever there's new data worth keeping. The file holds real accounts and student
   records, so it is kept out of Git. Without it, a reset leaves an empty database.

4. Optionally load the BSIT curriculum and a sample student:

   ```bash
   npx tsx scripts/seed-bsit.ts
   ```

5. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

For a presentation, `npx tsx scripts/seed-demo.ts` fills each year level of every program with an uploaded curriculum
up to 10 students and gives them grades up to the current semester, including a few that show a failed subject, an
INC, a retake, a subject taken out of order and an irregular load. Students that already have grades are left alone.
It only shows what it would do; add `--apply` to do it, and remove it all again later with `--remove --apply`.

Staff accounts are Supabase Auth users with a matching row in the `staff` table. Deans create chairperson accounts
from the app; the first dean account is created in Supabase Studio.

## Scripts

| Command                             | What it does                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                       | Start the development server                                           |
| `npm run build` / `npm start`       | Production build and server                                            |
| `npm run lint`                      | ESLint                                                                 |
| `npm test`                          | Run the automated tests                                                |
| `npm run db:save`                   | Save the local database's data to `supabase/seed.sql` for `db reset`   |
| `npx tsx scripts/seed-bsit.ts`      | Seed the BSIT curriculum and a sample student                          |
| `npx tsx scripts/seed-demo.ts`      | Demo students and grades for a presentation (see below)                |
| `npx tsx scripts/check-supabase.ts` | Manual check of grade entry against the real database (uses seed data) |

## Testing

```bash
npm test
```

The tests use Node's built-in test runner and need no database or network:

- `lib/domain/__tests__/` — the audit rules (prerequisites checked by term, co-requisites, INC, year standing,
  completion), term ordering,
  KSU grade validation, grade entry, subject-code matching, student ID format, reading Excel, CSV and .xls files, curriculum import planning,
  search input handling and the password policy.
- `tests/actions/` — server actions with Supabase replaced by an in-memory fake: permission checks for deans and
  chairpersons, and ID validation when registering, importing and editing students. These need Node 22.3+ and are
  skipped on older versions.

## Project structure

```
app/                  Pages and server actions (Next.js App Router)
  (dashboard)/        Signed-in pages: home, students, curriculum, programs, settings
  login/              Sign-in page
components/           App shell, import dialog and password input
  ui/                 Design system: buttons, form fields, cards, tables, badges, dialogs, toasts
lib/domain/           Audit engine, requirements, grade entry and import logic (no framework code)
lib/queries/          Data loading for pages
proxy.ts              Redirects signed-out visitors to /login
public/               Import templates
scripts/              Seed and maintenance scripts, test runner
supabase/migrations/  Database schema, row-level security policies and functions
tests/                Server action tests
```
