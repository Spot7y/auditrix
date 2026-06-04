interface ImportError {
  row: number;
  message: string;
}

interface Props {
  errors: ImportError[];
}

export default function ImportErrors({
  errors,
}: Props) {

  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className="
      mt-4
      rounded-xl
      border
      border-red-300
      bg-red-50
      p-4
      "
    >
      <h3
        className="
        font-semibold
        mb-2
        "
      >
        Import Errors
      </h3>

      <ul
        className="
        space-y-1
        text-sm
        "
      >
        {errors.map(
          (error, index) => (
            <li key={index}>
              Row {error.row}:
              {" "}
              {error.message}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}