export interface StudentAuditProfile {

  student: {

    id: string;

    student_number: string;

    first_name: string;

    last_name: string;

    department: string;

    curriculum_year: number;

    admission_year: number;

    residency_start_year: number;

    audit_status: string;
  };

  histories: {

    id: string;

    academic_year: string;

    final_grade: number;

    status: string;

    completion_date: string;

    courses: {

      course_code: string;

      course_title: string;
    };

    semesters: {

      semester_number: number;

      semester_name: string;
    };

  }[];
}