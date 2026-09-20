import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../lib/domain/supabase/adminClient";

type RawSubject = {
  code: string;
  title: string;
  units: number;
  yearLevel: 1 | 2 | 3 | 4;
  semester: 1 | 2;
  prerequisites: string[]; // AND-only, per every CEIT curriculum we reviewed
};

// Real BSIT curriculum — CC major sequence plus confirmed Gen Ed / Prof Ed
// subjects, cross-checked against the KSU student portal and against
// Binaraba's actual chairperson spreadsheet (which resolved two subjects
// that the original curriculum document had listed as requiring
// themselves as their own prerequisite — a transcription bug, not a real
// curriculum issue).
//
// PENDING: "SOC SCI 11" and "SOC SCI 12" below use the portal's CURRENT
// codes (Understanding the Self / Ethics). Binaraba's own record — a real,
// working chairperson document — disagrees: it lists Understanding the
// Self as "PSYCHO 12" and assigns SOC SCI 11 to Ethics instead. This may
// mean KSU revised Gen Ed codes since his student enrolled in 2023.
// Waiting on adviser confirmation — once resolved, only these two rows
// need updating.
const BSIT_SUBJECTS: RawSubject[] = [
  // Year 1, Semester 1
  { code: "CC 101", title: "Introduction to Computing", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "CC 102", title: "Computer Programming 1", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "NSTP 11-A", title: "Civic Welfare Training Service 1", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "NSTP 11-B", title: "Reserve Officers Training Corps 1", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "ENG 11", title: "Purposive Communication", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "MATH 11", title: "Mathematics in the Modern World", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "SOC SCI 13", title: "Readings in Philippine History", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "SOC SCI 11", title: "Understanding the Self", units: 3, yearLevel: 1, semester: 1, prerequisites: [] }, // PENDING — see note above
  { code: "PE 11", title: "Movement Enhancement", units: 2, yearLevel: 1, semester: 1, prerequisites: [] },
  { code: "FIL 11", title: "Kontekstwalisadong Komunikasyon sa Filipino", units: 3, yearLevel: 1, semester: 1, prerequisites: [] },

  // Year 1, Semester 2
  { code: "CC 103", title: "Introduction to Human Computer Interaction", units: 3, yearLevel: 1, semester: 2, prerequisites: ["CC 101"] },
  { code: "CC 104", title: "Computer Programming 2", units: 3, yearLevel: 1, semester: 2, prerequisites: ["CC 102"] },
  { code: "CC 105", title: "Fundamentals of Database Systems", units: 3, yearLevel: 1, semester: 2, prerequisites: ["CC 101"] },
  { code: "PE 12", title: "Fitness Exercises", units: 2, yearLevel: 1, semester: 2, prerequisites: ["PE 11"] },
  { code: "NSTP 12-A", title: "Civic Welfare Training Service 2", units: 3, yearLevel: 1, semester: 2, prerequisites: ["NSTP 11-A"] },
  { code: "NSTP 12-B", title: "Reserve Officers Training Corps 2", units: 3, yearLevel: 1, semester: 2, prerequisites: ["NSTP 11-B"] },
  { code: "SOC SCI 17", title: "Philippine Indigenous Communities", units: 3, yearLevel: 1, semester: 2, prerequisites: [] },
  { code: "COH 101", title: "Cordillera Heritage", units: 3, yearLevel: 1, semester: 2, prerequisites: [] },
  { code: "SOC SCI 16", title: "Art Appreciation", units: 3, yearLevel: 1, semester: 2, prerequisites: [] },
  { code: "ENG 12", title: "Developmental Reading", units: 3, yearLevel: 1, semester: 2, prerequisites: ["ENG 11"] },
  { code: "MATH 12", title: "College Algebra", units: 3, yearLevel: 1, semester: 2, prerequisites: ["MATH 11"] },

  // Year 2, Semester 1
  { code: "CC 106", title: "Data Structures and Algorithms", units: 3, yearLevel: 2, semester: 1, prerequisites: [] },
  { code: "CC 107", title: "Object Oriented Programming", units: 3, yearLevel: 2, semester: 1, prerequisites: ["CC 104"] },
  { code: "CC 108", title: "Discrete Mathematics", units: 3, yearLevel: 2, semester: 1, prerequisites: ["CC 101"] },
  { code: "CC 109", title: "Platforms and Technologies", units: 3, yearLevel: 2, semester: 1, prerequisites: ["CC 104"] },
  { code: "ENG 13", title: "Technical Writing", units: 3, yearLevel: 2, semester: 1, prerequisites: ["ENG 12"] },
  { code: "NAT SCI 12", title: "Environmental Science", units: 3, yearLevel: 2, semester: 1, prerequisites: [] },
  { code: "PROF ED 17", title: "Technology for Teaching and Learning 1", units: 3, yearLevel: 2, semester: 1, prerequisites: [] },
  { code: "SOC SCI 15", title: "The Contemporary World", units: 3, yearLevel: 2, semester: 1, prerequisites: [] },
  { code: "SOC SCI 14", title: "Life and Works of Rizal", units: 3, yearLevel: 2, semester: 1, prerequisites: [] },
  { code: "PE 13", title: "Physical Activities Towards Health and Fitness 1", units: 2, yearLevel: 2, semester: 1, prerequisites: ["PE 12"] },

  // Year 2, Semester 2
  { code: "CC 110", title: "Networking 1", units: 3, yearLevel: 2, semester: 2, prerequisites: ["CC 101"] },
  { code: "CC 111", title: "Integrative Programming and Technologies 1", units: 3, yearLevel: 2, semester: 2, prerequisites: ["CC 109"] },
  { code: "CC ELECT 11", title: "Multimedia", units: 3, yearLevel: 2, semester: 2, prerequisites: ["CC 101"] },
  { code: "CC ELECT 12", title: "Data Mining: Qualitative and Quantitative Analysis", units: 3, yearLevel: 2, semester: 2, prerequisites: ["CC 105", "CC 108"] },
  { code: "PROF ED 12", title: "The Child and Adolescent Learners and Learning Principles", units: 3, yearLevel: 2, semester: 2, prerequisites: ["PROF ED 17"] },
  { code: "PE 14", title: "Physical Activities Towards Health and Fitness II", units: 2, yearLevel: 2, semester: 2, prerequisites: ["PE 13"] },
  { code: "SOC SCI 12", title: "Ethics", units: 3, yearLevel: 2, semester: 2, prerequisites: ["SOC SCI 11"] }, // PENDING — see note above
  { code: "SOC SCI 19", title: "Philippine Government and Constitution", units: 3, yearLevel: 2, semester: 2, prerequisites: ["SOC SCI 14"] },
  { code: "ENG 14", title: "Public Speaking and Debate", units: 3, yearLevel: 2, semester: 2, prerequisites: ["ENG 13"] },

  // Year 3, Semester 1
  { code: "CC 112", title: "Networking 2", units: 3, yearLevel: 3, semester: 1, prerequisites: ["CC 110"] },
  { code: "CC 113", title: "Integrative Programming and Technologies 2", units: 3, yearLevel: 3, semester: 1, prerequisites: ["CC 101"] },
  { code: "CC 114", title: "Human Computer Interaction 2", units: 3, yearLevel: 3, semester: 1, prerequisites: ["CC 103"] },
  { code: "CC 115", title: "Web Systems and Technologies", units: 3, yearLevel: 3, semester: 1, prerequisites: ["CC 104", "CC ELECT 11"] },
  { code: "CC 116", title: "Information Management", units: 3, yearLevel: 3, semester: 1, prerequisites: ["CC 105", "CC 106"] },
  { code: "CC 117", title: "Quantitative Methods (Modeling and Simulation)", units: 3, yearLevel: 3, semester: 1, prerequisites: ["CC 111"] },
  { code: "NAT SCI 11", title: "Science, Technology and Society", units: 3, yearLevel: 3, semester: 1, prerequisites: [] },
  { code: "ELECTIVE 13", title: "Gender and Society", units: 3, yearLevel: 3, semester: 1, prerequisites: ["SOC SCI 12"] },
  { code: "PROF ED 11", title: "The Teaching Profession", units: 3, yearLevel: 3, semester: 1, prerequisites: ["PROF ED 12"] },

  // Year 3, Semester 2
  { code: "CC 118", title: "Information Assurance and Security 1", units: 3, yearLevel: 3, semester: 2, prerequisites: ["CC 112"] },
  { code: "CC 119", title: "Social and Professional Issues", units: 3, yearLevel: 3, semester: 2, prerequisites: ["ELECTIVE 13"] },
  { code: "CC 120", title: "Application Development and Emerging Technologies", units: 3, yearLevel: 3, semester: 2, prerequisites: ["CC 105", "CC 111", "CC ELECT 11"] },
  { code: "CC 121", title: "System Integration and Architecture 1", units: 3, yearLevel: 3, semester: 2, prerequisites: ["CC 105"] },
  { code: "CC 122", title: "System Administration and Maintenance", units: 3, yearLevel: 3, semester: 2, prerequisites: ["CC 101", "CC 114"] },
  { code: "CC 123", title: "Capstone Project and Research 1", units: 3, yearLevel: 3, semester: 2, prerequisites: ["CC 105", "CC 107", "CC 112", "CC 115"] },
  { code: "ENTREP 131", title: "Technopreneurship", units: 3, yearLevel: 3, semester: 2, prerequisites: [] },
  { code: "PROF ED 14", title: "Assessment of Learning 1", units: 3, yearLevel: 3, semester: 2, prerequisites: ["PROF ED 11"] },

  // Year 4, Semester 1 — Prof Ed 15/16 not directly shown in the portal screenshots
  // (which only covered through Year 3); carried over from the original curriculum
  // document since nothing contradicted them.
  { code: "CC 124", title: "Capstone Project and Research 2", units: 3, yearLevel: 4, semester: 1, prerequisites: ["CC 123"] },
  { code: "CC 125", title: "System Integration and Architecture 2", units: 3, yearLevel: 4, semester: 1, prerequisites: ["CC 121"] },
  { code: "CC 126", title: "Information Assurance and Security 2", units: 3, yearLevel: 4, semester: 1, prerequisites: ["CC 118"] },
  { code: "CC 127", title: "Seminars and Fieldtrips", units: 1, yearLevel: 4, semester: 1, prerequisites: ["CC 118", "CC 123"] },
  { code: "PROF ED 16", title: "Building and Enhancing New Literacies Across the Curriculum", units: 3, yearLevel: 4, semester: 1, prerequisites: ["PROF ED 14"] },
  { code: "PROF ED 15", title: "The Teacher and the Community, School Culture and Organizational Leadership", units: 3, yearLevel: 4, semester: 1, prerequisites: ["PROF ED 14"] },

  // Year 4, Semester 2 — CC 128's real prerequisite is "All subjects", handled separately below
  { code: "CC 128", title: "Practicum (486 hours)", units: 6, yearLevel: 4, semester: 2, prerequisites: [] },
];


async function main() {
  const client = createAdminClient();

  const { data: college, error: collegeError } = await client
    .from("colleges")
    .upsert(
      { name: "College of Engineering and Information Technology", short_name: "CEIT" },
      { onConflict: "short_name" }
    )
    .select()
    .single();
  if (collegeError) throw collegeError;

  const { data: curriculum, error: curriculumError } = await client
    .from("curricula")
    .upsert({ program: "BSIT", college_id: college.id, effective_year: 2019 }, { onConflict: "program,effective_year" })
    .select()
    .single();
  if (curriculumError) throw curriculumError;

  const { error: studentError } = await client.from("students").upsert({
    id: "23-110414",
    name: "Binaraba, Jhon Rey T.",
    curriculum_id: curriculum.id,
    nominal_year_level: 2,
  });
  if (studentError) throw studentError;

  const codeToId = new Map<string, string>();
  for (const s of BSIT_SUBJECTS) {
    const { data, error } = await client
      .from("subjects")
      .upsert(
        {
          curriculum_id: curriculum.id,
          code: s.code,
          title: s.title,
          units: s.units,
          year_level: s.yearLevel,
          semester: s.semester,
        },
        { onConflict: "curriculum_id,code" }
      )
      .select()
      .single();
    if (error) throw error;
    codeToId.set(s.code, data.id);
  }

  const subjectIds = [...codeToId.values()];
  const { error: deleteError } = await client.from("requirements").delete().in("subject_id", subjectIds);
  if (deleteError) throw deleteError;

  for (const s of BSIT_SUBJECTS) {
    for (const prereqCode of s.prerequisites) {
      const requiredId = codeToId.get(prereqCode);
      if (!requiredId) {
        console.warn(`Skipping unresolved prerequisite "${prereqCode}" for ${s.code}`);
        continue;
      }
      const { error } = await client.from("requirements").insert({
        subject_id: codeToId.get(s.code),
        type: "PREREQUISITE",
        required_subject_id: requiredId,
      });
      if (error) throw error;
    }
  }

  const { error: completionError } = await client.from("requirements").insert({
    subject_id: codeToId.get("CC 128"),
    type: "COMPLETION",
  });
  if (completionError) throw completionError;

  console.log(`Seeded ${BSIT_SUBJECTS.length} BSIT subjects and their requirements.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});