import {
  Badge,
} from "@/components/ui/badge";

export default function
StatusBadge({
  status,
}: {
  status: string;
}) {

  let className =
    "";

  switch (
    status
  ) {

    case "Validated":

      className =
        "bg-green-100 text-green-800";

      break;

    case "Pending":

      className =
        "bg-yellow-100 text-yellow-800";

      break;

    case "Violated":

      className =
        "bg-red-100 text-red-800";

      break;

    case "INC":

      className =
        "bg-orange-100 text-orange-800";

      break;

    default:

      className =
        "";
  }

  return (

    <Badge
      className={
        className
      }
    >
      {status}
    </Badge>

  );
}