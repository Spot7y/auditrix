import StudentSearchBar from "./StudentSearchBar";

export default function StudentsSearchPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Find a student</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">
        Start typing an ID number or name — matching students will appear below.
      </p>
      <div className="mt-8">
        <StudentSearchBar />
      </div>
    </main>
  );
}