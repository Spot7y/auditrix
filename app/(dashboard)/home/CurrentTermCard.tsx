import { CalendarDays } from "lucide-react";
import { setCurrentTerm } from "./actions";
import { describeTerm, parseTerm } from "../../../lib/domain/Term";
import { formatDateTime } from "../../../lib/format";
import type { CollegeTerm } from "../../../lib/queries/yearLevels";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { Label, Hint } from "../../../components/ui/Field";
import TermFields from "../../../components/ui/TermFields";
import SetSemesterButton from "./SetSemesterButton";
import Alert from "../../../components/ui/Alert";
import ActionForm from "../../../components/ui/ActionForm";

/** The dean's control for the college's current semester. */
export default function CurrentTermCard({ current, collegeName }: { current: CollegeTerm | null; collegeName: string }) {
  const parsed = current ? parseTerm(current.term) : null;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4.5 text-brand-600" aria-hidden />
            Current semester
          </span>
        }
        description={
          current
            ? `${describeTerm(current.term)} (${current.term}) · set by ${current.setBy}, ${formatDateTime(current.setAt)}`
            : `Not set yet for ${collegeName}.`
        }
      />
      <ActionForm action={setCurrentTerm}>
        <CardBody className="space-y-4">
          {!current && (
            <Alert tone="warning">
              Until it’s set, grade entry has no default term, regular and irregular students can’t be told apart, and
              year levels count every grade entered so far.
            </Alert>
          )}
          <div>
            <Label htmlFor="termYear">School year and semester</Label>
            <TermFields
              defaultYear={parsed ? String(parsed.year).padStart(2, "0") : ""}
              defaultSemester={current?.term.split("-")[1] ?? ""}
            >
              <SetSemesterButton currentTerm={current?.term ?? null} collegeName={collegeName} />
            </TermFields>
            <Hint>
              Two-digit school year, e.g. 25 – 1 is the first semester of SY 2025–2026. Midyear is S, as on KSU records:
              26 – S is the midyear between 25 – 2 and 26 – 1.
            </Hint>
          </div>
        </CardBody>
      </ActionForm>
    </Card>
  );
}
