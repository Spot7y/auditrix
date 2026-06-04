export function evaluateINC(
  histories: {
    course_code: string;
    status: string;
  }[],
): string[] {

  const warnings: string[] = [];

  histories.forEach((history) => {

    if (history.status === "INC") {

      warnings.push(
        `${history.course_code} has unresolved INC status`,
      );

    }

  });

  return warnings;
}