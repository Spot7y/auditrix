# Auditrix — notes for writing the capstone paper

These notes record what was built, the rules the system follows and where they come from, the decisions the
adviser made, and how the system was tested. They're written for whoever helps write the paper (Chapter 4 first),
so it can be written without the original development conversations.

**For an AI assistant helping with the paper:** read this file, then `README.md`. The code is the final authority;
the main logic is in `lib/domain/` (see the code map at the end). Ask the group for their latest paper draft before
writing, so the chapter matches their structure, terms and citation style. Don't invent evaluation results (survey
scores, respondent counts); section 9 says what testing was actually done.

---

## 1. What Auditrix is

A web-based curriculum and prerequisite audit system for Kalinga State University (KSU). Chairpersons keep each
program's curriculum and their students' grades; the system checks every subject a student took against its
prerequisites, co-requisites and year-standing requirements, and shows what each student has completed, can take
next, or took out of order.

It was built for the whole university (any college and program), and tested with CEIT programs (BSCpE, BSIT, BSCE).

### Users and what they can do

| Role | Can |
| --- | --- |
| **Dean** | See every program in their college (totals, charts, comparison, student movements); set the college's **current semester**; create programs (with a chairperson account); reassign chairpersons; **split the college**; **hand over the deanship**. Deans don't open individual students' records or search for students; that's the chairperson's work. |
| **Chairperson** | Manage their program's curriculum (versions, subjects, prerequisites, import/export); register and import students; enter grades; change a student's year level by hand for special cases; record shifts, transfers and drops; accept shifting students. |

A new chairperson gets a temporary password from the dean and must choose their own at first login.

Access is enforced in the database (Supabase row-level security): a chairperson only ever sees their own program's
data, a dean only their college's.

### Technology

- **Next.js 16** (App Router, server actions), **React 19**, **TypeScript**, **Tailwind CSS 4**
- **Supabase**: PostgreSQL database, authentication, row-level security
- **@react-pdf/renderer** for PDF export of curricula
- Automated tests with Node's built-in test runner

---

## 2. Features (by module)

### 2.1 Student audit (the core feature)
On each student's page every subject of their curriculum is listed by year and semester with its grade, the **term
it was taken**, and a status:

| Status | Meaning |
| --- | --- |
| **Completed** | Passed, and the pass counts (taken in order). |
| **Available** | Can be taken now (requirements met), or must be retaken (failed / taken out of order). |
| **Pending** | INC, or waiting for another subject's final grade. |
| **Unavailable** | Requirements not met yet; the missing ones are listed ("Needs: CC 104"). |
| **Violation** | Taken before a requirement was met; the reason is given, e.g. "CC 101 was taken in the same term (24-1)". |

The page also shows: subjects completed, units earned (with progress bar), subjects available now, number of
violations, a red alert listing subjects taken out of order, an amber "Year standing: please verify" alert when it
applies, the student's **year level** and **Regular / Irregular** status.

### 2.2 Grade entry
- Grades are entered per term (`YY-S`, e.g. 25-1), for the subjects of a chosen curriculum year and semester.
- Only valid KSU grades are accepted: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0 (passing), 5.0 (failing)
  and INC. (There is no 4.0.) A subject is recorded only once it has a grade.
- **Choosing the term:** the term's semester follows the chosen curriculum semester (1, 2, or S for the midyear) and
  can still be changed, e.g. for a back subject retaken in a midyear.
  The two-digit school year starts **empty** and must be typed; pressing Save without it saves nothing and asks for
  the year, so grades can't land in the wrong term by accident.
- Subjects the student can't take yet show why (e.g. "Can't take yet. Needs: MATH 111").
- Only the grades the chairperson picks are saved; changing an existing grade is a correction and asks for
  confirmation. Each subject shows its recorded grade and the term it was taken in separate columns,
  and its "New grade" starts at "No change" (or "Not taken" for a subject with nothing recorded). **A retake with the same result**
  (any grade, e.g. 5.0 in 25-1 and 5.0 again in 26-1) is saved as a new attempt in the later term.
- **INC completion:** a final grade for an INC keeps the subject in the term it was taken and records the term the
  INC was resolved in (shown as "INC → 25-1").
- **Earlier-term protection:** only the latest attempt of a subject is kept, so a grade from an earlier term than the
  recorded one is refused unless the chairperson confirms it corrects a wrongly entered term.
- After saving, a red message names any subject that just became a violation.
- Every grade ever entered is kept in the student's **grade logbook** (who entered it and when).

### 2.3 Curriculum management
- Versions per program by effective year (e.g. BSCpE 2019, 2023); a new version can copy an existing one.
- Subjects (code, title, units, year level, semester including **midyear**) and requirements: prerequisite,
  co-requisite, year standing, "all subjects completed".
- **New version from a file:** a new version starts as a copy of the latest one, or from an Excel (.xlsx or .xls) or
  CSV file with a **preview** (subjects and units) before saving. It's all or nothing: if anything fails, no version
  is created. A version with no subjects yet (a new program's first curriculum) can also be filled from a file on its
  Add subject page. The **Download template** link is next to both.
- **Delete several subjects at once** (versions without students): tick subjects, or a whole semester with "Select
  all", then **Delete selected**. The confirmation lists the subjects and any requirement the kept subjects lose
  (e.g. "CC 102 no longer requires CC 101"); those requirements are removed with them. Subjects with recorded grades
  can't be deleted. The deletion is listed in the version's change history.
- **Export** to CSV or PDF.
- A **change history** per version (who changed what, when).
- **Locked versions:** once any student is registered on a version, its subjects and requirements can't be added,
  edited, reordered, deleted or re-imported (the page shows "Locked: N students are registered", and the database
  refuses the change too). Changing a curriculum students already follow would silently change their audits, so an
  edited curriculum is a **new version**, which starts as a copy of the latest one.

### 2.4 Students
- Register one at a time, or **import** an Excel (.xlsx or .xls) or CSV file (the template, or the KSU-MIS "Export to
  Excel" file).
  The student template uses the KSU-MIS layout.
- Edit ID number and name; ID numbers are validated (e.g. 24-113792).
- **Shifting:** the releasing chairperson files a shift request; the receiving program's chairperson accepts the
  student into one of their curriculum versions.
- Transfers in/out and drops are recorded; every movement is kept in the student's history.
- **Locked records:** marking a student dropped or transferred out locks their record. Grades, details and year level
  can't be changed (enforced by the database, not only hidden in the screens); the audit and logbook stay viewable.
  A chairperson can **reopen** the record (e.g. the student came back); it's recorded in the history as a **returnee**,
  KSU's term for a student who comes back.
- The student list can be searched and **filtered** by year level, curriculum version and status (regular, irregular,
  not determined, with violations, dropped or transferred out). Under each name is the **reason** for its status
  (e.g. "Out of order: PHYS 201", "Not enrolled in GE 101, MATH 101").
- **Student Movements** page (sidebar): every shift, transfer, drop and returnee, searchable and filterable by type,
  program and year.
- **Student search** in the top bar on every page (Ctrl+K), next to the current semester (chairpersons only).
- **Printable student evaluation** (PDF, from the student's page): KSU letterhead with the college; the student's
  name, ID, program, curriculum version, year level and regular/irregular standing; subjects and units completed and
  how many were taken out of order; every subject by year and semester with its prerequisites, units, grade, term and
  remarks; and signature lines (evaluated by the chairperson, noted by the dean, conforme by the student). The footer
  says it was generated by Auditrix and is not a transcript of records. Only the student's chairperson can print it.

### 2.5 Dashboard
A **Needs attention** banner at the top lists what to act on (students with violations, an unset semester), with a
link to the matching filtered student list.
Per program: total students, **regular / irregular** counts with percentages (and how many are not determined),
students with violations, curriculum versions and shift/transfer/drop counts (with "View all" to the Student
Movements page), plus three charts built only from recorded data:
- regular / irregular / not determined (one stacked bar);
- students by year level (Freshman–Senior);
- subjects most often **taken out of order**.

Each chart has a one-line explanation, shows the exact numbers on hover (or keyboard focus), and has a "View as table"
option, so the colors are never the only way to read it. Dropped and transferred-out students aren't counted as
current students. The dean sets the current semester here and sees every program in the college **compared side by
side** (regular/irregular share per program, students with violations per program), a table with one row per program,
and tabs to open one program's charts.

### 2.6 Accounts and safety
- First-login password change for new chairpersons, with a **live checklist** that ticks each rule green (at least
  8 characters, a letter, a number, passwords match).
- Confirmation dialogs before hard-to-undo actions (dropping a student, deleting a subject, replacing a chairperson,
  saving grades); results shown as notifications.
- A refused form (e.g. an ID number that's already registered, a program that already exists) shows the reason above
  it and **keeps what was typed**.
- Each page shows a **placeholder** shaped like it while its data loads.

### 2.7 College changes (no system administrator needed)
Auditrix has no super administrator, because no office would operate one. Changes to a college are done by its dean:
- **Split the college** (e.g. CEIT's engineering programs stay, BSIT and BSMATH form a new college). The dean chooses
  where the programs go (a college already in Auditrix that has no programs or dean yet, or a new college with its
  name and short name), ticks the programs that move, and creates the new dean's account (temporary
  password, changed at first login). The new college is separate from and equal to the old one. Only the programs'
  college changes: their curriculum versions, students, grades, chairpersons and history stay as they are, and the
  new college starts on a copy of the current semester. A dean can only move their own programs, and at least one
  program has to stay.
- **Hand over the deanship.** The outgoing dean creates their successor's account; their own account is closed right
  away (signed out, can't log in again). Everything they recorded keeps their name, and the college's programs,
  students and history stay as they are.
- Both happen in one database transaction (all or nothing) and are listed in the college's **history** (what
  happened, who did it, when).

---

## 3. The audit rules and their sources

Sources used:
- **KSU Student Handbook** — definitions of prerequisite, co-requisite, INC, and of a regular student.
- **KSU Operations Manual: Student Development Services & Placement Guide** — year-level classification
  (Freshman to Senior) and regular/irregular student.

### 3.1 Terms
Written as on KSU records: the school year's first two digits and the semester (1 = first, 2 = second, S = midyear).
The midyear carries the year of the semester after it, so the order is 25-1 → 25-2 → 26-S (midyear) → 26-1, exactly as
the terms are listed on a student's KSU record. (Earlier versions wrote the midyear as 25-3 after 25-2; that was
changed so chairpersons can type the term exactly as it appears on the record.)

### 3.2 Prerequisites (Handbook: a prerequisite must be passed *prior to* taking the subject; credit for a subject
taken without it is nullified)
- A prerequisite must be passed in a term **before** the term the subject was taken. **The same term is a violation.**
- A subject taken while its prerequisite was still **INC** is a violation; an INC counts as passed only from the term
  it was resolved.
- A subject taken out of order gets **no credit**: it doesn't satisfy later prerequisites, doesn't count toward units
  or year level, and has to be retaken.

### 3.3 Co-requisites (Handbook: taken simultaneously, in the same semester)
- They pair both ways, even if only one subject lists the other.
- Both must be taken **in the same term**; taking only one, or them in different terms, is a violation.
- **Both must be passed together** (adviser/handbook): if one is failed, neither counts and both are retaken.

### 3.4 "All subjects completed" (e.g. Practicum)
Every *other* subject of the curriculum must be passed before the term it's taken.

### 3.5 Year level (Operations Manual + adviser)
The year level **follows what the student has finished** (adviser: "their year level should update based on what
they've finished in their curriculum"):

| Year level | Share of the curriculum's units passed |
| --- | --- |
| 1st year (Freshman) | less than 25% |
| 2nd year (Sophomore) | 25% to 50% |
| 3rd year (Junior) | **more than** 50% (exactly 50% stays 2nd year) |
| 4th year (Senior) | 75% or more |

Passing **every subject of the earlier years** also moves a student up, even if the units fall slightly short.
Only passes that count are included, and only those **before the current semester**, so students move up when the
dean moves to a new semester. The year level given at registration/import is a starting point until the grades show
more. A chairperson can set a year level by hand for a special case and set it back to automatic.

### 3.6 Year standing requirements (e.g. "Third yr standing")
Met by being on that year level. For a subject already taken, it's the year level going into that term, counting
only what was passed before it. When nothing was recorded for that term and the grades alone don't show the
standing (older grades may not be entered yet), the subject is marked **"Year standing: please verify"** (amber)
instead of a violation.

### 3.7 Regular and irregular (Operations Manual)
- **Regular:** enrolled in the full **prescribed load** for the current semester.
- **Irregular:** enrolled in less than the prescribed load; the missing subjects are listed.
- **Prescribed load:** the curriculum's subjects for the student's year level and the current semester; subjects
  already passed in an earlier term aren't expected again. Back subjects on top of a full load don't make a student
  irregular.
- **Enrollment** means grades recorded for the current semester. Until they're entered, the status is
  **"Not determined"** and the student isn't counted either way, so regular and irregular students are known once the
  semester's grades are in.
- **New first-year students** (no grades recorded at all) count as **regular** until their first grades are in, since
  newly registered first years are enrolled in the full first-year load. Once grades are entered, the grades decide,
  like for everyone else. Other students, including second-semester first years and older students still on the
  1st-year level, wait for their grades.

---

## 4. Decisions made with the adviser, and our interpretations

| Topic | Decision |
| --- | --- |
| Year level | Updates automatically from what the student has finished (no manual promotion). Chairperson can override for special cases. |
| Year levels | 1st–4th year only (no 5th year). |
| INC | No automatic lapse to 5.0; the chairperson sets INC and later enters the final grade. |
| Co-requisites | Must be passed together; if one fails, both are retaken. |
| Current semester | Set by the dean for the whole college. |
| Regular/irregular | Per the Operations Manual (prescribed load), not "has a failed subject". |
| Sophomore threshold | The Manual's text is cut off; we use **25% to 50%**. *(Interpretation — confirm with adviser.)* |
| Senior threshold | The Manual's text is garbled ("more than 50% but less than 75% or more"); we use **75% or more**. *(Interpretation.)* |
| Prescribed load | Curriculum subjects for the student's year level and the current semester. *(Interpretation.)* |
| Midyear with no prescribed subjects | Regular/irregular is "not determined". *(Interpretation.)* |
| Removability | Each feature was added as a separate change so it can be removed if the adviser asks; database changes have undo scripts in `supabase/rollbacks/`. |

---

## 5. A problem found and fixed (good material for the discussion)

The **first version** of the prerequisite checker decided, at the moment a grade was typed in, whether the
prerequisites were already in the database, and stored that as a permanent "invalid entry" flag. Testing showed this
gave wrong results:

1. **Grades entered out of order** (e.g. a 2nd-semester grade before the 1st-semester grades) were wrongly flagged.
2. A prerequisite **passed only in a later term** was not caught if it happened to be entered first.
3. **Same-term** prerequisite violations were caught or missed depending on the order of the rows.
4. **Co-requisite** results depended on entry order.
5. **Re-saving** a flagged grade after the prerequisite was entered erased the violation.

The checker was redesigned to work **from the terms** instead (sections 3.2–3.4): it compares the term each subject
was taken with the term each requirement was passed, every time the audit is shown. The result no longer depends on
the order grades are entered, and all five cases above are covered by automated tests.

---

## 6. Development timeline (from the project history)

- 2026-07-27 — first version (curriculum, students, grade entry, basic audit).
- Aug–Sep 2026 — curriculum versioning, deans and colleges, shifting/transfers/drops, curriculum and student imports,
  import preview, permission fixes, UI redesign (KSU green theme, confirmations, notifications), first-login password
  change, curriculum change history.
- 2026-09-29 — term-based checker (co-requisites, INC resolution), current semester, year standing at the time taken,
  regular/irregular per the Operations Manual.
- 2026-09-29/30 — automatic year levels (adviser's decision), KSU-MIS-style student template, .xls support for both
  imports.
- 2026-10-06 — protection against an earlier-term grade replacing a later one; password checklist.
- 2026-10-08 — both imports read Excel workbooks (.xlsx); the development "N" indicator hidden; `npm run db:save`
  to keep data through a database reset; "In progress" in the grade form, with ticking several subjects at once.
- 2026-10-08 — midyear terms written as on KSU records (26-S, between 25-2 and 26-1); ticking all skips subjects the
  student can't take yet; student pages follow the curriculum's subject order.
- 2026-10-11 — dropped/transferred-out records locked (with reopening); student list filters; dean's program table and
  tabs; grade logbook times taken from the app's clock; large tables read a page at a time; demo data script.
- 2026-10-12 — security: role check on every page, database-written audit trail, grade validation in the database,
  Next.js 16.4.0, security headers, idle sign-out, login blocking, plain error messages.
- 2026-10-12 — dashboard charts and program comparison, "Needs attention" banner, Student Movements page, top bar
  with the current semester and Ctrl+K search, student count in the sidebar, reasons in the student list, curriculum
  semester tabs, deeper KSU green for buttons and the current page. Deans no longer open individual student records
  (the search, student pages and movement links are for chairpersons); dashboard charts laid out in equal-height rows
  with a shared scale. The Kalinga State University seal is the logo (sidebar, login page corner and browser tab).
- 2026-10-14 — curriculum versions locked once students are registered on them; "In progress" removed (regular and
  irregular known once grades are in); grade form: the term's semester follows the curriculum semester and the
  school year must be typed; a retake with the same grade can be saved; bottleneck chart removed; first-year students
  count as regular until their first grades are in (new first years only, i.e. no grades recorded yet).
- 2026-10-14 — deans can split their college (programs move to a new college with its own dean) and hand over the
  deanship (successor's account created, their own closed), both recorded in the college history.
- 2026-10-14 — printable student evaluation (PDF); forms keep what was typed when refused; notifications can no
  longer be put on screen by a link; loading placeholders and fewer database round trips per page.

---

## 6b. Security (what protects the data)

| Threat | Protection in Auditrix |
| --- | --- |
| Opening another role's page by address (broken access control) | Every page checks the role; server actions check it again; row-level security in the database. Tested: a chairperson opening a dean's page (and the reverse) is sent back to their dashboard. |
| Seeing another program's students (IDOR) | Row-level security: a chairperson opening another program's student gets "Page not found". |
| Changing grades without a trace, or faking the logbook | A database trigger writes every grade change to the logbook with the signed-in user's name and the server's time; direct writes, edits and deletes of the logbook are refused. Tested by connecting to the database directly as a chairperson. |
| Invalid grades (e.g. 4.0, "Passed" with 5.0) | Database check constraints accept only KSU grades that match their status, and valid terms. |
| Privilege escalation (a chairperson making themselves dean) | Staff can only change their own name; role, program and college can't be changed by users. |
| SQL injection | No SQL is built from user input; all access goes through Supabase's parameterized API; search input is stripped of filter syntax. |
| Cross-site scripting (XSS) | React escapes all output; no raw HTML is rendered; Content Security Policy. |
| Cross-site request forgery (CSRF) | Next.js server actions only accept requests from Auditrix's own pages. |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Password guessing | 8+ characters with a letter and a number (also enforced by Supabase); an account is blocked for 15 minutes after 5 wrong passwords; Supabase's own rate limit. |
| Unattended computer | Signed out after 30 minutes without activity, with a warning. |
| Stolen database / backups | Passwords stored only as bcrypt hashes; the backup file is kept out of Git. |
| Man-in-the-middle | HTTPS when hosted (with HSTS); `npm run dev:https` for demos over a network. |
| Known vulnerabilities in libraries | Next.js upgraded to 16.4.0 (16.2.12 had critical advisories); `npm audit` shows 2 moderate, unexploitable in Auditrix. |
| Revealing system details in errors | Technical errors are logged on the server; users see plain messages. |
| Fake messages through a link (content spoofing) | Action results are kept in a short-lived cookie set by the server; the address only carries a random id that must match it, and redirects use fixed notice codes. Tested: `/home?success=…` and `/home?error=…` show nothing. |

**Limitation (for Chapter 5):** in the local setup, Supabase listens on the network with default keys and a
password-less Studio; the README gives a firewall rule to block it. A real deployment needs hosting with its own
keys, HTTPS and backups. Login blocking is kept in the server's memory (reset on restart; one server only).

---

## 7. Database (Supabase / PostgreSQL)

Main tables: `colleges`, `curricula` (program + effective year), `subjects`, `requirements` (prerequisite,
co-requisite, year standing, completion), `staff` (dean/chairperson), `students`, `subject_records` (latest attempt
per subject: status, grade, term, resolved term), `grade_audit_log` (every grade change), `student_transitions`
(shifts, transfers, drops, returnees), `shift_requests`, `curriculum_change_log`, `college_terms` (current semester per college),
`student_year_levels` (registered year level and chairperson overrides). `students.record_status` marks a record
locked (dropped or transferred out); database triggers refuse changes to a locked student's grades, details and year
level.

Security: row-level security on every table, scoped by role (chairperson → own program; dean → own college).
Operations that must all succeed together (creating a program with its chairperson, replacing a chairperson,
accepting a shift) run as single database transactions.

30 migrations in `supabase/migrations/` build the schema step by step. The app reads large tables a page at a time,
since the Supabase API returns at most 1,000 rows per request.

---

## 8. Screens to capture for Chapter 4

Screenshots of most of these are in `docs/screenshots/` (1440×900 window at 2× resolution, PNG; the `-full` files
are the whole page). They were taken from a local copy of the system with **sample data and placeholder names**
(e.g. "Dela Cruz, Juan Santos", chairperson "Juana Reyes", dean "Maria Santos"), not real students.

| File | Shows |
| --- | --- |
| `13-dean-creates-chairperson` | The dean creating a program and its chairperson account (temporary password) |
| `01-first-login-password` | That new chairperson's first login: the change-password page opens by itself; with the short password `abc1` the checklist is only partly green |
| `02-dean-dashboard` | Dean's dashboard with the Current semester card |
| `03-chairperson-dashboard` | Regular/irregular, violations, students by year level |
| `04-curriculum-import-preview` (`04a` = the dialog) | Curriculum import: what will be added/changed/removed, before saving |
| `05-grade-logbook` | Every grade recorded for a student, including a correction |
| `06-edit-student-year-level` | Year level: automatic or set by hand, with its history |
| `07-grade-save-confirmation` | Confirmation before saving a corrected grade |
| `08-earlier-term-warning` (`08a` = the row note) | Warning before an earlier-term grade replaces a later one |
| `09-import-students-dialog` | Importing students from Excel, CSV or the KSU-MIS .xls |
| `10-student-audit` | A regular student's audit (statuses, terms, year level) |
| `11-student-audit-violation` | A student with a subject taken out of order |
| `12-shift-in` | Accepting a shifting student |

Full list of screens worth showing:

1. Login page.
2. First-login password change with the green checklist.
3. Dean dashboard with the **Current semester** card.
4. Chairperson dashboard: the Needs attention banner and the charts (regular/irregular, year levels, out-of-order
   subjects), including a hover tooltip and "View as table".
4b. Dean dashboard with the program comparison charts.
4c. Student Movements page.
5. Curriculum page (versions, subjects, prerequisites), and the **import preview**.
6. Register student and the **Import students** dialog (with the template).
7. Student audit page: statuses, term column, a **Violation** with its reason, a co-requisite retake,
   "INC → 25-1", year level and Regular/Irregular badge.
8. Grade entry: choosing the term, the confirmation dialog, the earlier-term warning.
9. Grade logbook.
10. Edit student: year level (automatic / set by hand) and its history.
11. Shift request / accept shift-in; transfer and drop.
12. Curriculum PDF export.
13. Printable student evaluation (PDF), e.g. for a student with a subject taken out of order.

---

## 9. Testing that was actually done

**Automated unit and integration tests: 187, all passing** (`npm test`). They cover:

| Area | What is checked |
| --- | --- |
| Audit engine | prerequisite chains; pending prerequisites; the student's own grade; prerequisites checked by term (same term, later term, never passed, out-of-order credit, retake clears it, midyear ordering, waiting for a grade); INC (resolved term, taken while INC); co-requisites (passed together, one failed, different terms, one without the other, waiting, partner not yet available); "all subjects completed" |
| Year level & standing | Operations Manual thresholds (25 / >50 / 75%); finishing earlier years; only grades before the current semester; failed and out-of-order subjects excluded; registered level and chairperson override; year standing as of the term taken; "please verify" |
| Regular/irregular | full load, back subjects on top, already passed, missing subjects, failed earlier, graded in the current term, not determined (no enrollment, no semester set, nothing prescribed) |
| Grade entry | KSU grade values; rejected rows with reasons; same-term violations in any row order; entry order doesn't matter; violations survive re-saving; INC completion and its term; earlier-term protection and confirmed correction; malformed terms |
| Imports | curriculum CSV/.xls parsing and the import preview plan; reading CSV, Excel workbooks (.xlsx), KSU-MIS .xls and Excel re-saved .xls; old Excel 97-2003 and damaged files; student template and .xlsx import |
| Other rules | subject-code matching, student ID format, search terms, password policy (and checklist agreement) |
| Server actions & permissions | registering/importing/editing students (ID validation); dean/chairperson permission checks for reassigning chairpersons, creating programs and accepting shift-ins |

**Functional (end-to-end) testing** was done by scripting a browser (Playwright) against a local copy of the full
system (PostgreSQL + the app) with sample CEIT data, logging in as dean and chairpersons and clicking through each
feature: violations and their reasons, INC completion, the out-of-order warning after saving, setting the current
semester, automatic year levels moving up with grades and semesters, chairperson overrides, regular/irregular
counts, .xls and .xlsx imports, the earlier-term warning and the password checklist. All scenarios passed after fixes.

**Beta test (2026-10-14).** The whole system was used as a chairperson and as a dean, the way a user would,
including mistakes on purpose (blank and very long names, odd IDs and years, duplicate programs and emails, bad
files, locked records, moving every program out of a college). These were found and fixed:

| Found | Fixed |
| --- | --- |
| A student could be registered with a name of only spaces; names kept extra spaces and had no length limit | Names are tidied (extra spaces removed), must not be empty and are at most 120 characters, everywhere a name is typed or imported |
| Grades could be saved for a term that hasn't happened (typing 99 gave 99-1, SY 2099–2100) | Terms after the current semester are refused; a term more than 8 school years back is pointed out in the confirmation (e.g. 2 typed for 26) |
| A subject could be its own prerequisite, get the same prerequisite twice, or be part of a loop (A needs B, B needs A), so neither could ever be taken | All three are refused, by hand and in the curriculum import (skipped with a note) |
| A subject could have 999 units or a blank title | Units 0–12 and a title are required, by hand and in the import |
| A program code could contain symbols ("BS IT!") | Program codes are letters and numbers (BSCE, BSED-MATH) |
| The dean could move the semester back (26-1 → 25-1) with the same confirmation as moving forward | The confirmation names the semester and warns in red when it's earlier than the current one |
| Looking up your own program's shifting student showed an Accept form that then failed | It now explains that the receiving program accepts them |
| An ID pasted with spaces around it was blocked by the browser | Spaces are allowed in the box and removed on saving |

**Not done yet** (don't report results for these): user acceptance testing with actual chairpersons/deans, an
evaluation questionnaire (e.g. ISO 25010), and testing on a hosted (online) deployment. The system currently runs
locally.

---

## 10. Limitations and recommendations (for Chapter 5)

- Regular/irregular is known only once the current semester's grades are entered (new first-year students count as
  regular until then); enrollment isn't read from the KSU-MIS records.
- Only the **latest attempt** of each subject is kept as the student's record (all attempts remain in the logbook).
- Year levels and year standing are only as accurate as the grades entered; older grades of existing students
  should be encoded.
- No **bulk grade import** yet; grades are entered student by student.
- Files in the old Excel 97-2003 format aren't read (the system asks for them to be saved as .xlsx or CSV); Excel
  workbooks (.xlsx), CSV and the web-page .xls (KSU-MIS export / templates) are.
- No student-facing access (students get the printed evaluation from their chairperson).
- Not yet connected to KSU-MIS or the Registrar (the system has no access to them); data is entered or imported.
- Possible future features: suggested load for next semester (preventing violations before enrollment), bulk grade
  import, online deployment.

---

## 11. Code map

| Where | What |
| --- | --- |
| `lib/domain/AuditEngine.ts` | The audit: statuses, term-based checks, co-requisites, credit, year level |
| `lib/domain/requirements/` | Prerequisite/co-requisite, year standing, "all subjects completed" rules |
| `lib/domain/Term.ts` | Term format and ordering |
| `lib/domain/yearLevels.ts` | Unit thresholds and year level from progress |
| `lib/domain/enrollmentStatus.ts` | Regular / irregular |
| `lib/domain/import/GradeEntryService.ts` | Saving grades, INC completion, earlier-term protection |
| `lib/domain/import/GradeValidator.ts` | KSU grade values |
| `lib/domain/import/tableFile.ts`, `curriculumImport.ts` | Reading Excel/CSV/.xls, curriculum import plan |
| `lib/domain/passwordPolicy.ts` | Password rules |
| `app/(dashboard)/…` | Pages and server actions |
| `supabase/migrations/` | Database schema, security policies, functions |
| `lib/domain/__tests__/`, `tests/actions/` | Automated tests |
