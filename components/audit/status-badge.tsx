interface StatusBadgeProps {
  status:
    | "Validated"
    | "Pending"
    | "Violated";
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {

  const styles = {
    Validated:
      "bg-green-100 text-green-700",

    Pending:
      "bg-yellow-100 text-yellow-700",

    Violated:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`
        px-4
        py-2
        rounded-full
        text-sm
        font-semibold
        ${styles[status]}
      `}
    >
      {status}
    </span>
  );
}