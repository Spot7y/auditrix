import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function MetricCard({
  title,
  value,
  description,
}: {
  title: string;

  value: string;

  description: string;
}) {

  return (
    <Card>

      <CardContent className="p-6">

        <div className="space-y-2">

          <p
            className="
            text-sm
            text-slate-500
            "
          >
            {title}
          </p>

          <h2
            className="
            text-3xl
            font-bold
            "
          >
            {value}
          </h2>

          <p
            className="
            text-sm
            text-slate-400
            "
          >
            {description}
          </p>

        </div>

      </CardContent>

    </Card>
  );
}