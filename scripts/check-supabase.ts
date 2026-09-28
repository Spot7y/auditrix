import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../lib/domain/supabase/adminClient";
import { SupabaseAcademicRecordRepository } from "../lib/domain/import/SupabaseAcademicRecordRepository";
import { GradeEntryService } from "../lib/domain/import/GradeEntryService";
import { AuditEngine } from "../lib/domain/AuditEngine";

const STUDENT_ID = "23-110414";

async function main() {
const client = createAdminClient();
const repository = new SupabaseAcademicRecordRepository(client);

  const before = await repository.getRecord(STUDENT_ID);
  if (!before) {
    throw new Error(`No student found with id ${STUDENT_ID} — did you create the row in Studio?`);
  }

  console.log(
    `Loaded curriculum "${before.curriculum.program}" with ${before.curriculum.allSubjects().length} subjects.`
  );

  const engine = new AuditEngine();
  console.log("\nAudit BEFORE any grades entered:");
  console.log("CC 101:", engine.auditEnrollment(before, "CC 101"));
  console.log("CC 103:", engine.auditEnrollment(before, "CC 103"));

  const service = new GradeEntryService(repository);
  const result = await service.submit(
    {
      studentId: STUDENT_ID,
      term: "23-1",
      entries: [
        // deliberately messy casing/spacing — proving SubjectCodeResolver against real seeded data
        { subjectCode: "cc 101", input: { kind: "numeric", value: 1.75 } },
      ],
    },
    before.curriculum,
    "test-chairperson"
  );

  console.log("\nSubmission result:");
  console.log(result.rows);

  console.log("\nRe-audited curriculum after submission (CC 103 should now be VALIDATED):");
  console.log(result.audit.filter((r) => ["CC 101", "CC 103"].includes(r.subjectCode)));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});