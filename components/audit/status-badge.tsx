interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {

  const styles: Record<
    string,
    string
  > = {

    Validated:
      "bg-green-100 text-green-700",

    Pending:
      "bg-yellow-100 text-yellow-700",

    Violated:
      "bg-red-100 text-red-700",

    INC:
      "bg-orange-100 text-orange-700",

    Passed:
      "bg-green-100 text-green-700",

    Failed:
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
        ${
          styles[status] ??
          "bg-slate-100 text-slate-700"
        }
      `}
    >
      {status}
    </span>
  );
}