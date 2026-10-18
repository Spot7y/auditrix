import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { getAllTransitions } from "../../../../lib/queries/transitions";
import { getCurrentTerm } from "../../../../lib/queries/yearLevels";
import { describeTerm } from "../../../../lib/domain/Term";
import { countMovements, filterMovements, groupByProgram, MOVEMENT_TYPES } from "../../../../lib/domain/movements";
import { searchTerms } from "../../../../lib/domain/searchTerms";
import { formatDate, formatDateTime, TRANSITION_LABEL } from "../../../../lib/format";
import MovementsReportDocument, { type MovementReportRow } from "./MovementsReportDocument";

export const runtime = "nodejs";

/**
 * The Student movements list as a printable PDF, with the same search and
 * filters as the page. Row-level security limits it to what the signed-in
 * staff member can see: a chairperson their program, a dean their college.
 */
export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || (staff.role !== "chairperson" && staff.role !== "dean")) {
    return new Response("Only a program chairperson or a college dean can print the movements report.", { status: 403 });
  }
  const isDean = staff.role === "dean";
  const params = new URL(request.url).searchParams;
  const filter = {
    q: params.get("q") ?? "",
    type: params.get("type") ?? "",
    program: params.get("program") ?? "",
    year: params.get("year") ?? "",
  };

  const [all, term] = await Promise.all([getAllTransitions(), getCurrentTerm()]);
  const shown = filterMovements(all, filter);

  const toRow = (t: (typeof shown)[number]): MovementReportRow => ({
    studentName: t.studentName,
    studentId: t.studentId,
    movement: TRANSITION_LABEL[t.type] ?? t.type,
    programs:
      t.fromProgram && t.toProgram && t.fromProgram !== t.toProgram
        ? `${t.fromProgram} to ${t.toProgram}`
        : (t.fromProgram ?? t.toProgram ?? "—"),
    notes: t.notes ?? "",
    recordedBy: t.recordedBy,
    date: formatDate(t.recordedAt),
  });
  // Oldest first, the order they happened, like a logbook.
  const chronological = [...shown].reverse();
  const groups = isDean
    ? groupByProgram(chronological).map((g) => ({ program: g.program, rows: g.rows.map(toRow) }))
    : chronological.length > 0
      ? [{ program: null, rows: chronological.map(toRow) }]
      : [];

  const query = searchTerms(filter.q).join(" ");
  const scope = [
    filter.program || (isDean ? "All programs" : staff.program),
    filter.type ? (TRANSITION_LABEL[filter.type] ?? filter.type) : "All movements",
    filter.year ? `Recorded in ${filter.year}` : "All years",
    query && `Students matching “${query}”`,
  ]
    .filter(Boolean)
    .join(" · ");

  const counts = countMovements(shown);
  const now = new Date();

  const pdf = await renderToBuffer(
    <MovementsReportDocument
      sealPath={path.join(process.cwd(), "public", "ksu-seal.png")}
      college={staff.collegeName}
      scope={scope}
      asOf={term ? `${describeTerm(term.term)} (${term.term})` : formatDate(now)}
      counts={MOVEMENT_TYPES.map((type) => [TRANSITION_LABEL[type], counts[type]])}
      total={shown.length}
      groups={groups}
      preparedBy={{ name: staff.name, role: isDean ? "College Dean" : "Program Chairperson" }}
      notedBy={isDean ? { caption: "Received by:", role: "Signature over printed name" } : { caption: "Noted by:", role: "College Dean" }}
      generatedAt={formatDateTime(now)}
    />
  );

  const fileName = ["movements", filter.program || (isDean ? "college" : staff.program), filter.year].filter(Boolean).join("-");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // Opens in the browser's PDF viewer, ready to print or save.
      "Content-Disposition": `inline; filename="${fileName.replace(/[^\w-]+/g, "_")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
