interface Violation {
  courseCode: string;
  missingPrerequisite: string;
  reason: string;
}

interface Props {
  violation: Violation;
}

export default function ViolationCard({
  violation,
}: Props) {
  return (
    <div
      className="
        border
        border-red-200
        bg-red-50
        rounded-xl
        p-4
      "
    >
      <h3 className="font-semibold">
        {violation.courseCode}
      </h3>

      <p className="text-sm">
        Missing:
        {" "}
        {violation.missingPrerequisite}
      </p>

      <p className="text-sm text-red-600">
        {violation.reason}
      </p>
    </div>
  );
}