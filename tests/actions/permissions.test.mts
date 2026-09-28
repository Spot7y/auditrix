// Security tests for the server actions that use the admin (RLS-bypassing)
// Supabase client. Because row-level security doesn't apply to that client,
// these actions must check permissions themselves — each "cannot" case below
// passed on the old code and is blocked now.
import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { form, importFromRoot, mockCurrentStaff, mockNext, projectFile, redirectOf, type Staff } from "../helpers/modules.mjs";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let writes: string[];

function resetDatabase() {
  writes = [];
  tables = {
    curricula: [
      { id: "cpe-2023", program: "BSCPE", college_id: "ceit" },
      { id: "ce-2023", program: "BSCE", college_id: "ceit" },
      { id: "nur-2023", program: "BSN", college_id: "nursing" },
    ],
    staff: [{ id: "old-ce-chair", role: "chairperson", program: "BSCE" }],
    shift_requests: [
      { student_id: "23-10001", from_program: "BSCE" },
      { student_id: "23-10002", from_program: "BSCPE" },
    ],
    students: [
      { id: "23-10001", name: "Juan", curriculum_id: "ce-2023" },
      { id: "23-10002", name: "Maria", curriculum_id: "cpe-2023" },
    ],
  };
}

// A small in-memory stand-in for the parts of the admin client these actions use.
function table(name: string) {
  const filters: [string, unknown][] = [];
  const rows = () => (tables[name] ?? []).filter((row) => filters.every(([key, value]) => row[key] === value));
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => (filters.push([key, value]), query),
    limit: () => query,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => {
      const row = rows()[0];
      return row ? { data: row, error: null } : { data: null, error: { message: "not found" } };
    },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(resolve),
  };
  return query;
}

const adminClient = {
  from: table,
  rpc: async (fn: string, args: Row) => {
    writes.push(`rpc ${fn}`);
    if (fn === "replace_chairperson") {
      const old = tables.staff.filter((s) => s.role === "chairperson" && s.program === args.p_program);
      tables.staff = tables.staff.filter((s) => !old.includes(s));
      tables.staff.push({ id: args.p_new_chair_id, role: "chairperson", program: args.p_program });
      return { data: old.map((s) => s.id), error: null };
    }
    if (fn === "accept_shift_in") {
      const target = tables.curricula.find((c) => c.id === args.p_new_curriculum_id);
      tables.students.find((s) => s.id === args.p_student_id)!.curriculum_id = args.p_new_curriculum_id;
      tables.shift_requests = tables.shift_requests.filter((r) => r.student_id !== args.p_student_id);
      return { data: target?.program, error: null };
    }
    if (fn === "create_program_with_chairperson") {
      tables.curricula.push({ id: "new", program: args.p_program, college_id: args.p_college_id });
      return { data: null, error: null };
    }
    throw new Error(`unexpected rpc ${fn}`);
  },
  auth: {
    admin: {
      createUser: async () => (writes.push("createUser"), { data: { user: { id: "new-user" } }, error: null }),
      deleteUser: async () => (writes.push("deleteUser"), { error: null }),
      updateUserById: async (id: string) => (writes.push(`ban ${id}`), { error: null }),
    },
  },
};

const current: { staff: Staff } = { staff: null };
mockNext();
mockCurrentStaff(current);
mock.module(projectFile("lib/domain/supabase/adminClient.ts"), {
  namedExports: { createAdminClient: () => adminClient },
});

type Action = (formData: FormData) => Promise<void>;
const { reassignChairperson } = await importFromRoot<{ reassignChairperson: Action }>(
  "app/(dashboard)/programs/reassign/actions.ts"
);
const { createProgram } = await importFromRoot<{ createProgram: Action }>("app/(dashboard)/programs/new/action.ts");
const { acceptShiftIn } = await importFromRoot<{ acceptShiftIn: Action }>(
  "app/(dashboard)/students/shift-in/actions.ts"
);

const ceitDean: Staff = { id: "dean", name: "Dean", role: "dean", program: null, collegeId: "ceit" };
const cpeChair: Staff = { id: "chair", name: "Joan Doe", role: "chairperson", program: "BSCPE", collegeId: null };
const newChair = { chairName: "New Chair", chairEmail: "new@ksu.edu.ph", chairPassword: "secret123" };

beforeEach(resetDatabase);

describe("Reassign chairperson", () => {
  it("a dean cannot replace the chairperson of another college's program", async () => {
    current.staff = ceitDean;
    const url = await redirectOf(reassignChairperson, form({ program: "BSN", ...newChair }));
    assert.match(url ?? "", /That program is not under your college/);
    assert.deepEqual(writes, []);
  });

  it("a dean can replace the chairperson of their own college's program", async () => {
    current.staff = ceitDean;
    assert.equal(await redirectOf(reassignChairperson, form({ program: "BSCE", ...newChair })), "/home");
    assert.deepEqual(writes, ["createUser", "rpc replace_chairperson", "ban old-ce-chair"]);
  });

  it("a chairperson cannot reassign chairpersons", async () => {
    current.staff = cpeChair;
    const url = await redirectOf(reassignChairperson, form({ program: "BSCE", ...newChair }));
    assert.match(url ?? "", /Only a dean account/);
    assert.deepEqual(writes, []);
  });
});

describe("Create program", () => {
  it("a program name that already exists is rejected", async () => {
    current.staff = ceitDean;
    const url = await redirectOf(createProgram, form({ program: "bsn", effectiveYear: "2025", ...newChair }));
    assert.match(url ?? "", /A program named BSN already exists/);
    assert.deepEqual(writes, []);
  });

  it("a new program name is accepted", async () => {
    current.staff = ceitDean;
    const url = await redirectOf(createProgram, form({ program: "BSEE", effectiveYear: "2025", ...newChair }));
    assert.equal(url, "/home");
    assert.deepEqual(writes, ["createUser", "rpc create_program_with_chairperson"]);
  });
});

describe("Accept shift-in", () => {
  it("a chairperson cannot move a student into another program's curriculum", async () => {
    current.staff = cpeChair;
    const url = await redirectOf(acceptShiftIn, form({ studentId: "23-10001", newCurriculumId: "nur-2023" }));
    assert.match(url ?? "", /only accept students into your own program/);
    assert.deepEqual(writes, []);
  });

  it("a chairperson cannot accept a student who is already in their program", async () => {
    current.staff = cpeChair;
    const url = await redirectOf(acceptShiftIn, form({ studentId: "23-10002", newCurriculumId: "cpe-2023" }));
    assert.match(url ?? "", /already in your program/);
    assert.deepEqual(writes, []);
  });

  it("a chairperson can accept a student into their own program", async () => {
    current.staff = cpeChair;
    const url = await redirectOf(acceptShiftIn, form({ studentId: "23-10001", newCurriculumId: "cpe-2023" }));
    assert.match(url ?? "", /23-10001 has been accepted into BSCPE/);
    assert.deepEqual(writes, ["rpc accept_shift_in"]);
  });
});
