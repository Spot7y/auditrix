import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { InMemoryAcademicRecordRepository } from "../import/InMemoryAcademicRecordRepository";
import { GradeEntryService } from "../import/GradeEntryService";
import type { Subject } from "../Subject";

const subjects: Subject[] = [
  { code: "CC 101", title: "Intro to Computing", units: 3, yearLevel: 1, semester: 1, requirements: [] },
  {
    code: "CC 103",
    title: "Introduction to HCI",
    units: 3,
    yearLevel: 1,
    semester: 2,
    requirements: [new CoursePrerequisite("CC 101")],
  },
];

const curriculum = new CurriculumMap("BSIT", subjects);
const record = new AcademicRecord("23-110414", curriculum, 1, []); // nothing taken yet

const repository = new InMemoryAcademicRecordRepository([record]);
const service = new GradeEntryService(repository);



async function main() {
  const result = await service.submit(
    {
      studentId: "23-110414",
      term: "23-1",
      entries: [
        { subjectCode: "cc 101", input: { kind: "numeric", value: 1.5 } },
        { subjectCode: "CC 999", input: { kind: "numeric", value: 2.0 } },
        { subjectCode: "CC 103", input: { kind: "numeric", value: 7.5 } },
      ],
    },
    curriculum,
    "test-chairperson"
  );

  console.log("Rows:");
  console.log(result.rows);

  console.log("\nRe-audited curriculum after the batch:");
  console.log(result.audit);
}

main();
