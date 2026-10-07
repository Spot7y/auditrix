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
| **Dean** | See every program and student in their college; set the college's **current semester**; create programs (with a chairperson account); reassign chairpersons. |
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
| **Pending** | In progress, INC, or waiting for another subject's final grade. |
| **Unavailable** | Requirements not met yet; the missing ones are listed ("Needs: CC 104"). |
| **Violation** | Taken before a requirement was met; the reason is given, e.g. "CC 101 was taken in the same term (24-1)". |

The page also shows: subjects completed, units earned (with progress bar), subjects available now, number of
violations, a red alert listing subjects taken out of order, an amber "Year standing: please verify" alert when it
applies, the student's **year level** and **Regular / Irregular** status.

### 2.2 Grade entry
- Grades are entered per term (`YY-S`, e.g. 25-1), for the subjects of a chosen curriculum year and semester.
- Only valid KSU grades are accepted: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0 (passing), 5.0 (failing)
  and INC. (There is no 4.0.) The system also understands "in progress", but the grade form doesn't offer it yet;
  see section 10.
- Only changed grades are saved; changing an existing grade is a correction and asks for confirmation.
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
- **Import** from CSV or .xls, with a **preview** of what will be added, changed or removed before saving.
- **Export** to CSV or PDF.
- A **change history** per version (who changed what, when).

### 2.4 Students
- Register one at a time, or **import** a CSV or .xls file (the template, or the KSU-MIS "Export to Excel" file).
  The student template uses the KSU-MIS layout.
- Edit ID number and name; ID numbers are validated (e.g. 24-113792).
- **Shifting:** the releasing chairperson files a shift request; the receiving program's chairperson accepts the
  student into one of their curriculum versions.
- Transfers in/out and drops are recorded; every movement is kept in the student's history.

### 2.5 Dashboard
Per program: total students, **regular / irregular** counts (and how many are not determined), students with
violations, students by year level (Freshman–Senior), curriculum versions, shifts/transfers/drops, and recent
movements. The dean sees every program in the college and sets the current semester here.

### 2.6 Accounts and safety
- First-login password change for new chairpersons, with a **live checklist** that ticks each rule green (at least
  8 characters, a letter, a number, passwords match).
- Confirmation dialogs before hard-to-undo actions (dropping a student, deleting a subject, replacing a chairperson,
  saving grades); results shown as notifications.

---

## 3. The audit rules and their sources

Sources used:
- **KSU Student Handbook** — definitions of prerequisite, co-requisite, INC, and of a regular student.
- **KSU Operations Manual: Student Development Services & Placement Guide** — year-level classification
  (Freshman to Senior) and regular/irregular student.

### 3.1 Terms
Written `YY-S`: the school year's first two digits and the semester (1 = first, 2 = second, 3 = midyear).
Order: 25-1 → 25-2 → 25-3 (midyear) → 26-1.

### 3.2 Prerequisites (Handbook: a prerequisite must be passed *prior to* taking the subject; credit for a subject
taken without it is nullified)
- A prerequisite must be passed in a term **before** the term the subject was taken. **The same term is a violation.**
- A subject taken while its prerequisite was still **INC** is a violation; an INC counts as passed only from the term
  it was resolved.
- A subject taken out of order gets **no credit**: it doesn't satisfy later prerequisites, doesn't count toward units
  or year level, and has to be retaken.
- If a prerequisite's grade is still "in progress" from an earlier term, the subject is **Pending** (waiting), not
  a violation.

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
- **Enrollment** means grades or "in progress" recorded for the current semester. With nothing recorded, the status is
  **"Not determined"** and the student isn't counted either way. (Because the grade form can't record "in progress"
  yet, a student's status for the current semester is known only once their grades for it are entered.)

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

---

## 7. Database (Supabase / PostgreSQL)

Main tables: `colleges`, `curricula` (program + effective year), `subjects`, `requirements` (prerequisite,
co-requisite, year standing, completion), `staff` (dean/chairperson), `students`, `subject_records` (latest attempt
per subject: status, grade, term, resolved term), `grade_audit_log` (every grade change), `student_transitions`
(shifts, transfers, drops), `shift_requests`, `curriculum_change_log`, `college_terms` (current semester per college),
`student_year_levels` (registered year level and chairperson overrides).

Security: row-level security on every table, scoped by role (chairperson → own program; dean → own college).
Operations that must all succeed together (creating a program with its chairperson, replacing a chairperson,
accepting a shift) run as single database transactions.

27 migrations in `supabase/migrations/` build the schema step by step.

---

## 8. Screens to capture for Chapter 4

Screenshots of most of these are in `docs/screenshots/` (1440×900 window at 2× resolution, PNG; the `-full` files
are the whole page). They were taken from a local copy of the system with **sample data and placeholder names**
(e.g. "Dela Cruz, Juan Santos", chairperson "Juana Reyes", dean "Maria Santos"), not real students.

| File | Shows |
| --- | --- |
| `01-first-login-password` | A new chairperson choosing a password; checklist partly green |
| `02-dean-dashboard` | Dean's dashboard with the Current semester card |
| `03-chairperson-dashboard` | Regular/irregular, violations, students by year level |
| `04-curriculum-import-preview` (`04a` = the dialog) | Curriculum import: what will be added/changed/removed, before saving |
| `05-grade-logbook` | Every grade recorded for a student, including a correction |
| `06-edit-student-year-level` | Year level: automatic or set by hand, with its history |
| `07-grade-save-confirmation` | Confirmation before saving a corrected grade |
| `08-earlier-term-warning` (`08a` = the row note) | Warning before an earlier-term grade replaces a later one |
| `09-import-students-dialog` | Importing students from CSV or the KSU-MIS .xls |
| `10-student-audit` | A regular student's audit (statuses, terms, year level) |
| `11-student-audit-violation` | A student with a subject taken out of order |
| `12-shift-in` | Accepting a shifting student |

Full list of screens worth showing:

1. Login page.
2. First-login password change with the green checklist.
3. Dean dashboard with the **Current semester** card.
4. Chairperson dashboard (regular/irregular, violations, students by year level).
5. Curriculum page (versions, subjects, prerequisites), and the **import preview**.
6. Register student and the **Import students** dialog (with the template).
7. Student audit page: statuses, term column, a **Violation** with its reason, a co-requisite retake,
   "INC → 25-1", year level and Regular/Irregular badge.
8. Grade entry: choosing the term, the confirmation dialog, the earlier-term warning.
9. Grade logbook.
10. Edit student: year level (automatic / set by hand) and its history.
11. Shift request / accept shift-in; transfer and drop.
12. Curriculum PDF export.

---

## 9. Testing that was actually done

**Automated unit and integration tests: 149, all passing** (`npm test`). They cover:

| Area | What is checked |
| --- | --- |
| Audit engine | prerequisite chains; pending prerequisites; the student's own grade; prerequisites checked by term (same term, later term, never passed, out-of-order credit, retake clears it, midyear ordering, waiting for a grade); INC (resolved term, taken while INC); co-requisites (passed together, one failed, different terms, one without the other, waiting, partner not yet available); "all subjects completed" |
| Year level & standing | Operations Manual thresholds (25 / >50 / 75%); finishing earlier years; only grades before the current semester; failed and out-of-order subjects excluded; registered level and chairperson override; year standing as of the term taken; "please verify" |
| Regular/irregular | full load, back subjects on top, already passed, missing subjects, failed earlier, graded in the current term, not determined (no enrollment, no semester set, nothing prescribed) |
| Grade entry | KSU grade values; rejected rows with reasons; same-term violations in any row order; entry order doesn't matter; violations survive re-saving; INC completion and its term; earlier-term protection and confirmed correction; malformed terms |
| Imports | curriculum CSV/.xls parsing and the import preview plan; reading CSV, KSU-MIS .xls and Excel re-saved .xls; student template import |
| Other rules | subject-code matching, student ID format, search terms, password policy (and checklist agreement) |
| Server actions & permissions | registering/importing/editing students (ID validation); dean/chairperson permission checks for reassigning chairpersons, creating programs and accepting shift-ins |

**Functional (end-to-end) testing** was done by scripting a browser (Playwright) against a local copy of the full
system (PostgreSQL + the app) with sample CEIT data, logging in as dean and chairpersons and clicking through each
feature: violations and their reasons, INC completion, the out-of-order warning after saving, setting the current
semester, automatic year levels moving up with grades and semesters, chairperson overrides, regular/irregular
counts, .xls imports, the earlier-term warning and the password checklist. All scenarios passed after fixes.

**Not done yet** (don't report results for these): user acceptance testing with actual chairpersons/deans, an
evaluation questionnaire (e.g. ISO 25010), and testing on a hosted (online) deployment. The system currently runs
locally.

---

## 10. Limitations and recommendations (for Chapter 5)

- The grade form can't record **"in progress"** yet, so current enrollment (regular/irregular) is known only once
  grades are entered.
- Only the **latest attempt** of each subject is kept as the student's record (all attempts remain in the logbook).
- Year levels and year standing are only as accurate as the grades entered; older grades of existing students
  should be encoded.
- No **bulk grade import** yet; grades are entered student by student.
- Real Excel files (.xlsx, Excel 97-2003 .xls) aren't read; CSV and the web-page .xls (KSU-MIS export / templates) are.
- No student-facing access and no printable student evaluation yet.
- Not yet connected to KSU-MIS or the Registrar (the system has no access to them); data is entered or imported.
- Possible future features: suggested load for next semester (preventing violations before enrollment), printable
  evaluation, bulk grade import, online deployment.

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
| `lib/domain/import/tableFile.ts`, `curriculumImport.ts` | Reading CSV/.xls, curriculum import plan |
| `lib/domain/passwordPolicy.ts` | Password rules |
| `app/(dashboard)/…` | Pages and server actions |
| `supabase/migrations/` | Database schema, security policies, functions |
| `lib/domain/__tests__/`, `tests/actions/` | Automated tests |
