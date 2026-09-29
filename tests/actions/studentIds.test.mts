// ID number validation in the actions that create or change a student's ID.
import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { form, importFromRoot, mockCurrentStaff, mockNext, projectFile, redirectOf } from "../helpers/modules.mjs";
import { readFileSync } from "node:fs";
import type { ImportResult } from "../../components/ImportDialog";

let inserted: Record<string, unknown>[];
let updated: Record<string, unknown>[];
const userClient = {
  from: () => ({
    insert: async (row: Record<string, unknown>) => (inserted.push(row), { error: null }),
    update: (row: Record<string, unknown>) => ({
      eq: () => ({ select: async () => (updated.push(row), { data: [{ id: row.id }], error: null }) }),
    }),
  }),
};

mockNext();
mockCurrentStaff({ staff: { id: "chair", name: "Joan Doe", role: "chairperson", program: "BSCPE", collegeId: null } });
mock.module(projectFile("lib/domain/supabase/serverClient.ts"), {
  namedExports: { createServerClientForUser: async () => userClient },
});

type Action = (formData: FormData) => Promise<void>;
const { registerStudent } = await importFromRoot<{ registerStudent: Action }>("app/(dashboard)/students/new/actions.ts");
const { updateStudentInfo } = await importFromRoot<{ updateStudentInfo: Action }>(
  "app/(dashboard)/students/[id]/edit/actions.ts"
);
const { importStudentsCsv } = await importFromRoot<{
  importStudentsCsv: (prev: ImportResult | null, formData: FormData) => Promise<ImportResult>;
}>("app/(dashboard)/students/new/importActions.ts");

beforeEach(() => {
  inserted = [];
  updated = [];
});

describe("Register student", () => {
  const student = { name: "Doe, John", curriculumId: "cpe-2023", nominalYearLevel: "1" };

  it("rejects an ID in the wrong format", async () => {
    assert.match((await redirectOf(registerStudent, form({ id: "24113792", ...student }))) ?? "", /must look like/);
    assert.deepEqual(inserted, []);
  });

  it("accepts a valid ID, removing stray spaces", async () => {
    assert.equal(
      await redirectOf(registerStudent, form({ id: " 24-113792 ", ...student })),
      "/students/24-113792?success=Registered Doe, John."
    );
    assert.equal(inserted[0].id, "24-113792");
  });
});

describe("Import students", () => {
  it("skips rows with an invalid ID and imports the rest", async () => {
    const csv = 'id,name,year_level\n24-113792,"Doe, John",3\n2411,"Bad, Id",2\n23-19991,"King, Stephen",4\n';
    const result = await importStudentsCsv(null, form({ curriculumId: "cpe-2023", file: new File([csv], "s.csv") }));

    assert.deepEqual(
      inserted.map((s) => s.id),
      ["24-113792", "23-19991"]
    );
    assert.deepEqual(result.warnings, ['Row 3: "2411" is not a valid ID number, skipped.']);
    assert.equal(result.success, "Imported 2 student(s). 1 note(s).");
  });

  it("imports the downloadable template as it is", async () => {
    const template = readFileSync(new URL(projectFile("public/student-import-template.xls")), "utf8");
    const result = await importStudentsCsv(
      null,
      form({ curriculumId: "cpe-2023", file: new File([template], "student-import-template.xls") })
    );

    assert.deepEqual(
      inserted.map((s) => [s.id, s.name, s.nominal_year_level]),
      [
        ["26-100001", "Dela Cruz, Juan Santos", 1],
        ["26-100002", "Santos, Maria Reyes", 1],
        ["26-100003", "Reyes, Jose Garcia", 1],
      ]
    );
    assert.equal(result.success, "Imported 3 student(s).");
  });
});

describe("Edit student", () => {
  it("rejects changing the ID to one in the wrong format", async () => {
    const url = await redirectOf(updateStudentInfo, form({ currentId: "24-113792", id: "24-11", name: "Doe, John" }));
    assert.match(url ?? "", /must look like/);
    assert.deepEqual(updated, []);
  });

  it("still lets an older record with a non-standard ID have its name edited", async () => {
    const url = await redirectOf(updateStudentInfo, form({ currentId: "23-1", id: "23-1", name: "Renamed" }));
    assert.equal(url, "/students/23-1?success=Student details saved.");
    assert.deepEqual(updated, [{ id: "23-1", name: "Renamed" }]);
  });
});
