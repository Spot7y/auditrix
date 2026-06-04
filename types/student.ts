export type GradeStatus =
  | "Passed"
  | "Failed"
  | "INC"
  | "Dropped"
  | "Withdrawn";

export interface StudentCourseRecord {
  courseCode: string;
  courseTitle: string;

  academicYear: string;

  semester: number;

  finalGrade?: number;

  status: GradeStatus;

  completionDate?: string;
}

export interface StudentProfile {
  studentNumber: string;

  firstName: string;

  lastName: string;

  department: string;

  curriculumYear: number;

  residencyStartYear: number;

  records: StudentCourseRecord[];
}