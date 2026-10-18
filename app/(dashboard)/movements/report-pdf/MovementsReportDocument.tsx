import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { KsuLetterhead, PDF_GREEN as GREEN, PDF_LINE as LINE, PDF_MUTED as MUTED, Signature } from "../../../../components/pdf/KsuLetterhead";

// Wrap whole words only; the default splits words like "Trans-ferred" across lines.
Font.registerHyphenationCallback((word) => [word]);

export interface MovementReportRow {
  studentName: string;
  studentId: string;
  movement: string;
  programs: string;
  notes: string;
  recordedBy: string;
  date: string;
}

export interface MovementsReportProps {
  sealPath: string;
  college: string | null;
  /** What the report covers, e.g. "BSIT · All movements · All years". */
  scope: string;
  asOf: string;
  /** Count of each movement, in order, e.g. ["Shifted in", 3]. */
  counts: [string, number][];
  total: number;
  /** One group per program for a dean; a single unnamed group for a chairperson. */
  groups: { program: string | null; rows: MovementReportRow[] }[];
  preparedBy: { name: string; role: string };
  notedBy: { caption: string; role: string };
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 46, paddingHorizontal: 36, fontSize: 8.5, fontFamily: "Helvetica", color: "#1d2420" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1, marginTop: 10 },
  scope: { fontSize: 9, textAlign: "center", marginTop: 3 },
  asOf: { fontSize: 8.5, textAlign: "center", color: MUTED, marginTop: 2, marginBottom: 10 },

  summary: { flexDirection: "row", borderWidth: 0.75, borderColor: LINE },
  summaryCell: { flex: 1, paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: 0.75, borderRightColor: LINE },
  summaryLast: { flex: 1, paddingVertical: 5, paddingHorizontal: 6, backgroundColor: "#eef3f0" },
  summaryLabel: { fontSize: 7.5, color: MUTED },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 1 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN, textTransform: "uppercase" },
  sectionCount: { fontSize: 8, color: MUTED },
  headRow: { flexDirection: "row", backgroundColor: "#eef3f0", borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: LINE, paddingVertical: 3 },
  headCell: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: MUTED, paddingHorizontal: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3 },
  cell: { paddingHorizontal: 3 },
  colNo: { width: "4%", textAlign: "right" },
  colName: { width: "20%" },
  colId: { width: "10%" },
  colMovement: { width: "11%" },
  colPrograms: { width: "13%" },
  colNotes: { width: "18%" },
  colBy: { width: "14%" },
  colDate: { width: "10%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  empty: { marginTop: 12, textAlign: "center", color: MUTED },

  signatures: { flexDirection: "row", justifyContent: "space-around", marginTop: 30 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
});

function HeadRow() {
  return (
    <View style={styles.headRow}>
      <Text style={[styles.headCell, styles.colNo]}>No.</Text>
      <Text style={[styles.headCell, styles.colName]}>Student</Text>
      <Text style={[styles.headCell, styles.colId]}>ID number</Text>
      <Text style={[styles.headCell, styles.colMovement]}>Movement</Text>
      <Text style={[styles.headCell, styles.colPrograms]}>Program</Text>
      <Text style={[styles.headCell, styles.colNotes]}>Notes</Text>
      <Text style={[styles.headCell, styles.colBy]}>Recorded by</Text>
      <Text style={[styles.headCell, styles.colDate]}>Date</Text>
    </View>
  );
}

function Row({ n, r }: { n: number; r: MovementReportRow }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.cell, styles.colNo]}>{n}</Text>
      <Text style={[styles.cell, styles.colName, styles.bold]}>{r.studentName}</Text>
      <Text style={[styles.cell, styles.colId]}>{r.studentId}</Text>
      <Text style={[styles.cell, styles.colMovement]}>{r.movement}</Text>
      <Text style={[styles.cell, styles.colPrograms]}>{r.programs}</Text>
      <Text style={[styles.cell, styles.colNotes]}>{r.notes}</Text>
      <Text style={[styles.cell, styles.colBy]}>{r.recordedBy}</Text>
      <Text style={[styles.cell, styles.colDate]}>{r.date}</Text>
    </View>
  );
}

/** The Student movements list as a printable report: counts, every movement, signature lines. */
export default function MovementsReportDocument(props: MovementsReportProps) {
  return (
    <Document title={`Student movements report – ${props.scope}`} author="Auditrix">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <KsuLetterhead sealPath={props.sealPath} college={props.college} />

        <Text style={styles.title}>STUDENT MOVEMENTS REPORT</Text>
        <Text style={styles.scope}>{props.scope}</Text>
        <Text style={styles.asOf}>As of {props.asOf}</Text>

        <View style={styles.summary}>
          {props.counts.map(([label, count]) => (
            <View key={label} style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={styles.summaryValue}>{count}</Text>
            </View>
          ))}
          <View style={styles.summaryLast}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{props.total}</Text>
          </View>
        </View>

        {props.total === 0 && <Text style={styles.empty}>No movement is recorded for this report.</Text>}

        {props.groups.map((group) => (
          <View key={group.program ?? "all"}>
            {/* The title and header stay with the first row instead of ending a page. */}
            <View wrap={false}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{group.program ?? "Movements"}</Text>
                <Text style={styles.sectionCount}>
                  {group.rows.length} movement{group.rows.length === 1 ? "" : "s"}
                </Text>
              </View>
              <HeadRow />
              {group.rows[0] && <Row n={1} r={group.rows[0]} />}
            </View>
            {group.rows.slice(1).map((r, i) => (
              <Row key={i} n={i + 2} r={r} />
            ))}
          </View>
        ))}

        <View style={styles.signatures} wrap={false}>
          <Signature caption="Prepared by:" name={props.preparedBy.name} role={props.preparedBy.role} />
          <Signature caption={props.notedBy.caption} name="" role={props.notedBy.role} />
        </View>

        <View style={styles.footer} fixed>
          <Text>Student movements report · Generated by Auditrix on {props.generatedAt}.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
