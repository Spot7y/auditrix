export interface CurriculumCourse {
  id: string;

  courseCode: string;

  courseTitle: string;

  yearLevel: number;

  semester: number;

  prerequisites: string[];
}