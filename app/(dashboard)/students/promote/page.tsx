import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { getCurrentTerm, getPromotionCandidates } from "../../../../lib/queries/yearLevels";
import { promotionTerm } from "../../../../lib/domain/yearLevels";
import { describeTerm } from "../../../../lib/domain/Term";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";
import EmptyState from "../../../../components/ui/EmptyState";
import PromoteForm from "./PromoteForm";

export const metadata: Metadata = { title: "Promote students" };

export default async function PromoteStudentsPage() {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson") redirect("/home");

  const [currentTerm, candidates] = await Promise.all([getCurrentTerm(), getPromotionCandidates()]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: "/students", label: "All students" }}
        title="Promote to next year level"
        description={`Move ${staff.program} students up one year level at the start of a school year. Everyone is checked except 4th-year, dropped and transferred-out students; uncheck anyone who isn’t moving up.`}
      />

      {!currentTerm ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="The current semester isn’t set"
            description="Ask your dean to set the current semester on their dashboard first, so the new year levels are recorded from the right term."
          />
        </Card>
      ) : candidates.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No students yet" description="Registered students are listed here." />
        </Card>
      ) : (
        <PromoteForm
          candidates={candidates}
          defaultTerm={promotionTerm(currentTerm.term)}
          currentTermLabel={`${describeTerm(currentTerm.term)} (${currentTerm.term})`}
        />
      )}
    </div>
  );
}
