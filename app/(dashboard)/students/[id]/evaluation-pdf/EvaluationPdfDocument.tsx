import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Wrap whole words only; the default splits words like "stand-ing" across lines.
Font.registerHyphenationCallback((word) => [word]);

export interface EvaluationSubjectRow {
  code: string;
  title: string;
  units: number;
  requirements: string;
  grade: string;
  term: string;
  remarks: string;
  /** Taken out of order: the row is tinted and its remarks are red. */
  violation: boolean;
}

export interface EvaluationSection {
  label: string;
  units: number;
  subjects: EvaluationSubjectRow[];
}

export interface EvaluationPdfProps {
  sealPath: string;
  college: string | null;
  student: {
    id: string;
    name: string;
    program: string;
    curriculum: string;
    yearLevel: string;
    standing: string;
  };
  asOf: string;
  summary: { completed: number; subjects: number; earnedUnits: number; totalUnits: number; violations: number };
  violationCodes: string[];
  sections: EvaluationSection[];
  evaluatedBy: string;
  generatedAt: string;
}

const GREEN = "#14532d";
const MUTED = "#5b6660";
const LINE = "#c9d1cc";

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 46, paddingHorizontal: 36, fontSize: 8.5, fontFamily: "Helvetica", color: "#1d2420" },
  letterhead: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  seal: { width: 54, height: 54, marginRight: 12 },
  letterText: { alignItems: "center" },
  republic: { fontSize: 8.5, color: MUTED },
  university: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GREEN, marginTop: 1 },
  college: { fontSize: 9.5, marginTop: 1 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: GREEN, marginTop: 4 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1, marginTop: 10 },
  asOf: { fontSize: 8.5, textAlign: "center", color: MUTED, marginTop: 2, marginBottom: 10 },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.75, borderColor: LINE, paddingHorizontal: 8, paddingTop: 6 },
  infoItem: { width: "50%", flexDirection: "row", marginBottom: 5 },
  infoLabel: { width: 78, color: MUTED },
  infoValue: { flex: 1, fontFamily: "Helvetica-Bold" },

  summary: { flexDirection: "row", marginTop: 8, borderWidth: 0.75, borderColor: LINE },
  summaryCell: { flex: 1, paddingVertical: 5, paddingHorizontal: 8, borderRightWidth: 0.75, borderRightColor: LINE },
  summaryLast: { flex: 1, paddingVertical: 5, paddingHorizontal: 8 },
  summaryLabel: { fontSize: 7.5, color: MUTED },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 1 },

  notice: { marginTop: 8, padding: 6, borderWidth: 0.75, borderColor: "#e5a4a4", backgroundColor: "#fdf2f2", color: "#8a1c1c" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN, textTransform: "uppercase" },
  sectionUnits: { fontSize: 8, color: MUTED },
  headRow: { flexDirection: "row", backgroundColor: "#eef3f0", borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: LINE, paddingVertical: 3 },
  headCell: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: MUTED, paddingHorizontal: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3 },
  rowViolation: { backgroundColor: "#fdf2f2" },
  cell: { paddingHorizontal: 3 },
  colCode: { width: "11%" },
  colTitle: { width: "29%" },
  colReq: { width: "15%" },
  colUnits: { width: "6%", textAlign: "right" },
  colGrade: { width: "7%", textAlign: "right" },
  colTerm: { width: "8%" },
  colRemarks: { width: "24%" },
  bold: { fontFamily: "Helvetica-Bold" },
  red: { color: "#a11d1d" },

  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  signature: { width: "30%" },
  signatureCaption: { fontSize: 7.5, color: MUTED, marginBottom: 22 },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: "#1d2420", paddingTop: 2, alignItems: "center" },
  signatureName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, minHeight: 10 },
  signatureRole: { fontSize: 7.5, color: MUTED },

  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
});

function SubjectRow({ s }: { s: EvaluationSubjectRow }) {
  return (
    <View style={[styles.row, s.violation ? styles.rowViolation : {}]} wrap={false}>
      <Text style={[styles.cell, styles.colCode]}>{s.code}</Text>
      <Text style={[styles.cell, styles.colTitle]}>{s.title}</Text>
      <Text style={[styles.cell, styles.colReq]}>{s.requirements}</Text>
      <Text style={[styles.cell, styles.colUnits]}>{s.units}</Text>
      <Text style={[styles.cell, styles.colGrade, styles.bold]}>{s.grade}</Text>
      <Text style={[styles.cell, styles.colTerm]}>{s.term}</Text>
      <Text style={[styles.cell, styles.colRemarks, s.violation ? styles.red : {}]}>{s.remarks}</Text>
    </View>
  );
}

function Signature({ caption, name, role }: { caption: string; name: string; role: string }) {
  return (
    <View style={styles.signature}>
      <Text style={styles.signatureCaption}>{caption}</Text>
      <View style={styles.signatureLine}>
        <Text style={styles.signatureName}>{name}</Text>
        <Text style={styles.signatureRole}>{role}</Text>
      </View>
    </View>
  );
}

export default function EvaluationPdfDocument(props: EvaluationPdfProps) {
  const { student, summary } = props;
  const percent = summary.totalUnits ? Math.round((summary.earnedUnits / summary.totalUnits) * 100) : 0;

  const info: [string, string][] = [
    ["Name", student.name],
    ["ID number", student.id],
    ["Program", student.program],
    ["Curriculum", student.curriculum],
    ["Year level", student.yearLevel],
    ["Standing", student.standing],
  ];

  return (
    <Document title={`Student evaluation – ${student.name} (${student.id})`} author="Auditrix">
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={props.sealPath} style={styles.seal} />
          <View style={styles.letterText}>
            <Text style={styles.republic}>Republic of the Philippines</Text>
            <Text style={styles.university}>KALINGA STATE UNIVERSITY</Text>
            {props.college && <Text style={styles.college}>{props.college}</Text>}
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>STUDENT EVALUATION</Text>
        <Text style={styles.asOf}>As of {props.asOf}</Text>

        <View style={styles.infoGrid}>
          {info.map(([label, value]) => (
            <View key={label} style={styles.infoItem}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Subjects completed</Text>
            <Text style={styles.summaryValue}>
              {summary.completed} of {summary.subjects}
            </Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Units earned</Text>
            <Text style={styles.summaryValue}>
              {summary.earnedUnits} of {summary.totalUnits} ({percent}%)
            </Text>
          </View>
          <View style={styles.summaryLast}>
            <Text style={styles.summaryLabel}>Taken out of order</Text>
            <Text style={[styles.summaryValue, summary.violations > 0 ? styles.red : {}]}>
              {summary.violations === 0 ? "None" : summary.violations}
            </Text>
          </View>
        </View>

        {props.violationCodes.length > 0 && (
          <Text style={styles.notice}>
            {props.violationCodes.join(", ")} {props.violationCodes.length === 1 ? "was" : "were"} taken before a
            prerequisite was passed, or without a co-requisite in the same term. The credit doesn’t count until{" "}
            {props.violationCodes.length === 1 ? "it is" : "they are"} retaken with the requirements met.
          </Text>
        )}

        {props.sections.map((section) => (
          <View key={section.label}>
            {/* The title and header stay with the first row instead of ending a page. */}
            <View wrap={false}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                <Text style={styles.sectionUnits}>{section.units} units</Text>
              </View>
              <View style={styles.headRow}>
                <Text style={[styles.headCell, styles.colCode]}>Code</Text>
                <Text style={[styles.headCell, styles.colTitle]}>Descriptive title</Text>
                <Text style={[styles.headCell, styles.colReq]}>Prerequisite</Text>
                <Text style={[styles.headCell, styles.colUnits]}>Units</Text>
                <Text style={[styles.headCell, styles.colGrade]}>Grade</Text>
                <Text style={[styles.headCell, styles.colTerm]}>Term</Text>
                <Text style={[styles.headCell, styles.colRemarks]}>Remarks</Text>
              </View>
              {section.subjects[0] && <SubjectRow s={section.subjects[0]} />}
            </View>
            {section.subjects.slice(1).map((s) => (
              <SubjectRow key={s.code} s={s} />
            ))}
          </View>
        ))}

        <View style={styles.signatures} wrap={false}>
          <Signature caption="Evaluated by:" name={props.evaluatedBy} role="Program Chairperson" />
          <Signature caption="Noted by:" name="" role="College Dean" />
          <Signature caption="Conforme:" name={student.name} role="Student" />
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {student.name} ({student.id}) · Generated by Auditrix on {props.generatedAt}. Not a transcript of records.
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
