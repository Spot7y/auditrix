import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, DoorOpen, LogIn, LogOut, Repeat, UserX, type LucideIcon } from "lucide-react";
import { getStudentAudit } from "../../../../../lib/queries/students";
import { getTransitionsForStudent, getPendingShiftRequest } from "../../../../../lib/queries/transitions";
import { formatDate, TRANSITION_LABEL } from "../../../../../lib/format";
import { recordTransferIn, recordTransferOut, recordDropped, requestShiftOut, cancelShiftRequest } from "./actions";
import PageHeader from "../../../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../../../components/ui/Card";
import ConfirmButton from "../../../../../components/ui/ConfirmButton";
import Alert from "../../../../../components/ui/Alert";

export const metadata: Metadata = { title: "Transfer or shift" };

function ActionCard({
  icon: Icon,
  title,
  description,
  action,
  studentId,
  button,
  confirmTitle,
  confirmDescription,
  tone = "primary",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  studentId: string;
  button: string;
  confirmTitle: string;
  confirmDescription: string;
  tone?: "primary" | "danger";
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex flex-1 gap-4 p-5">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            tone === "danger" ? "bg-red-50 text-status-violation" : "bg-brand-50 text-brand-700"
          }`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="font-semibold text-ink-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>
        </div>
      </div>
      <form action={action} className="flex justify-end border-t border-line px-5 py-3">
        <input type="hidden" name="studentId" value={studentId} />
        <ConfirmButton
          tone={tone}
          variant="secondary"
          size="sm"
          title={confirmTitle}
          description={confirmDescription}
          confirmLabel={button}
        >
          {button}
        </ConfirmButton>
      </form>
    </Card>
  );
}

export default async function StudentTransitionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentAudit(id);
  if (!data) notFound();

  const [history, isPending] = await Promise.all([getTransitionsForStudent(id), getPendingShiftRequest(id)]);
  const who = `${data.studentName} (${data.studentId})`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/students/${id}`, label: "Back to audit" }}
        eyebrow={data.studentId}
        title="Transfer, shift or drop"
        description={`${data.studentName} · ${data.program}`}
      />

      {isPending && (
        <Alert tone="warning" title="Shift request pending" className="mb-6">
          This student stays enrolled in {data.program} until another program’s chairperson accepts them.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isPending ? (
          <ActionCard
            icon={Repeat}
            title="Cancel shift request"
            description="Withdraw the pending request. The student stays in this program."
            action={cancelShiftRequest}
            studentId={id}
            button="Cancel request"
            confirmTitle="Cancel the shift request?"
            confirmDescription={`${who} will no longer appear to other chairpersons as shifting out of ${data.program}.`}
          />
        ) : (
          <ActionCard
            icon={Repeat}
            title="Request shift out"
            description={`The student wants to move to another KSU program. They stay in ${data.program} until the receiving chairperson accepts them.`}
            action={requestShiftOut}
            studentId={id}
            button="Request shift"
            confirmTitle="Request a shift out?"
            confirmDescription={`${who} will be visible to every program’s chairperson as shifting out of ${data.program}, and the chairperson who accepts them will take over their record.`}
          />
        )}
        <ActionCard
          icon={LogOut}
          title="Transferred out"
          description="The student left KSU for another school. Their record stays here, tagged."
          action={recordTransferOut}
          studentId={id}
          button="Mark transferred out"
          confirmTitle="Mark as transferred out?"
          confirmDescription={`This records that ${who} left KSU. It’s added to the student’s permanent history.`}
          tone="danger"
        />
        <ActionCard
          icon={LogIn}
          title="Transferred in"
          description={`The student came from another school. Enter credited subjects afterwards on the Enter Grades page; only ${data.program} subject codes are accepted.`}
          action={recordTransferIn}
          studentId={id}
          button="Mark transferred in"
          confirmTitle="Mark as transferred in?"
          confirmDescription={`This records that ${who} transferred into ${data.program} from another school.`}
        />
        <ActionCard
          icon={UserX}
          title="Dropped"
          description={`The student dropped out of ${data.program}. Their record stays here, tagged.`}
          action={recordDropped}
          studentId={id}
          button="Mark as dropped"
          confirmTitle="Mark as dropped?"
          confirmDescription={`This records that ${who} dropped out of ${data.program}. It’s added to the student’s permanent history and counted on the dashboard.`}
          tone="danger"
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="History" description="Every transfer, shift and drop recorded for this student." />
        {history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Nothing recorded yet.</p>
        ) : (
          <ol className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 text-sm">
                <DoorOpen className="size-4 text-ink-400" aria-hidden />
                <span className="font-medium text-ink-900">{TRANSITION_LABEL[h.type] ?? h.type}</span>
                {h.fromProgram && h.toProgram && (
                  <span className="inline-flex items-center gap-1 text-ink-600">
                    {h.fromProgram} <ArrowRight className="size-3.5" aria-label="to" /> {h.toProgram}
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-500">
                  {formatDate(h.recordedAt)} · {h.recordedBy}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
