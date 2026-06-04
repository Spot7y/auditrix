export interface ImportError {
  row: number;
  message: string;
}

export function
validateStudents(
  rows: any[],
): ImportError[] {

  const errors:
    ImportError[] = [];

  rows.forEach(
    (
      row,
      index,
    ) => {

      if (
        !row.student_number
      ) {
        errors.push({
          row: index + 1,
          message:
            "Missing student number",
        });
      }

      if (
        !row.first_name
      ) {
        errors.push({
          row: index + 1,
          message:
            "Missing first name",
        });
      }

      if (
        !row.last_name
      ) {
        errors.push({
          row: index + 1,
          message:
            "Missing last name",
        });
      }

    },
  );

  return errors;
}