interface Props {
  message: string;
}

export default function WarningCard({
  message,
}: Props) {
  return (
    <div
      className="
        border
        border-yellow-200
        bg-yellow-50
        rounded-xl
        p-4
      "
    >
      {message}
    </div>
  );
}