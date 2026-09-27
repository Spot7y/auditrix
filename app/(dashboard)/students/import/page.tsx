import { getCurriculumVersionsForStaff } from "../../../../lib/queries/curriculum";
import ImportStudentsForm from "./ImportStudentsForm";

export default async function ImportStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; warnings?: string }>;
}) {
  const { error, success, warnings } = await searchParams;
  const versions = await getCurriculumVersionsForStaff();

  if (!versions) {
    return (
      <main className="px-8 py-12">
        <p className="text-sm text-[color:var(--status-violation)]">
          Only a chairperson account linked to a program can import students.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Import Students</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">{versions.program}</p>

      {error && <p className="mt-4 text-sm text-[color:var(--status-violation)]">{error}</p>}
      {success && <p className="mt-4 text-sm text-[color:var(--status-completed)]">{success}</p>}
      {warnings && <p className="mt-2 max-w-2xl text-xs text-[color:var(--status-pending)]">{warnings}</p>}

      <ImportStudentsForm versions={versions.versions} />

      
    </main>
  );
}
