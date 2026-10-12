// Saves the data in the local Supabase database (accounts, colleges, programs,
// curricula, students, grades and history) to supabase/seed.sql.
//
// `npx supabase db reset` runs the migrations and then loads that file, so a
// reset brings back what was saved here instead of leaving an empty system.
// Run it again whenever the data worth keeping changes:
//
//   npm run db:save
//
// Needs the local Supabase to be running (`npx supabase start`).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const output = new URL("supabase/seed.sql", root);

function docker(args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// The database container is named after the project_id in supabase/config.toml.
const projectId = readFileSync(new URL("supabase/config.toml", root), "utf8").match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
const container = `supabase_db_${projectId}`;

let running;
try {
  running = docker(["ps", "--format", "{{.Names}}"]).split(/\r?\n/);
} catch {
  fail("Could not reach Docker. Start Docker Desktop and the local Supabase (npx supabase start), then try again.");
}
if (!running.includes(container)) {
  fail(`The local Supabase isn't running (no ${container} container). Start it with: npx supabase start`);
}

const connection = ["exec", "-e", "PGPASSWORD=postgres", container];
const psql = (sql) =>
  docker([...connection, "psql", "-h", "127.0.0.1", "-U", "postgres", "-d", "postgres", "-tAc", sql]).trim();

let dump;
try {
  dump = docker([
    ...connection,
    "pg_dump",
    "-h", "127.0.0.1",
    "-U", "postgres",
    "-d", "postgres",
    "--data-only",
    "--column-inserts",
    "--no-owner",
    "--no-privileges",
    // Every table of the app, plus the login accounts.
    "-t", "public.*",
    "-t", "auth.users",
    "-t", "auth.identities",
  ]);
} catch (error) {
  fail(`Could not read the database:\n${error.stderr || error.message}`);
}

const body = dump
  .split(/\r?\n/)
  // psql-only commands (e.g. \restrict) that `supabase db reset` can't run.
  .filter((line) => !line.startsWith("\\"))
  .join("\n");

const [staff, programs, students, grades] = psql(
  "select (select count(*) from public.staff) || ',' || (select count(distinct program) from public.curricula) || ',' ||" +
    " (select count(*) from public.students) || ',' || (select count(*) from public.subject_records)"
).split(",");

writeFileSync(
  output,
  `-- Data saved from the local database with \`npm run db:save\` on ${new Date().toLocaleString()}.
-- \`npx supabase db reset\` loads this file after the migrations. It holds real
-- accounts and student records, so it is kept out of Git (see .gitignore).

-- Load rows in any order without tripping foreign keys or triggers.
SET session_replication_role = replica;
${body}
SET session_replication_role = DEFAULT;
`,
  "utf8"
);

console.log(`Saved ${staff} staff accounts, ${programs} programs, ${students} students and ${grades} grades to supabase/seed.sql.`);
console.log("A reset (npx supabase db reset) now brings this data back.");
