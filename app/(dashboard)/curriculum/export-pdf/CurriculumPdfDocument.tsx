import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface PdfSubjectRow {
  code: string;
  title: string;
  units: number;
  requirementsText: string;
}

interface PdfSection {
  label: string;
  subjects: PdfSubjectRow[];
}

interface CurriculumPdfProps {
  program: string;
  effectiveYear: number;
  sections: PdfSection[];
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginTop: 2, marginBottom: 16, color: "#555555" },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#178549",
    marginTop: 16,
    marginBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 4,
  },
  headerCell: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#666666" },
  colCode: { width: "13%" },
  colTitle: { width: "34%" },
  colUnits: { width: "8%" },
  colReq: { width: "45%" },
});

export default function CurriculumPdfDocument({ program, effectiveYear, sections }: CurriculumPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Curriculum</Text>
        <Text style={styles.subtitle}>
          {program} — {effectiveYear}
        </Text>

        {sections.map((section) => (
          <View key={section.label} wrap={false}>
            <Text style={styles.sectionHeader}>{section.label}</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, styles.colCode]}>Code</Text>
              <Text style={[styles.headerCell, styles.colTitle]}>Subject Description</Text>
              <Text style={[styles.headerCell, styles.colUnits]}>Units</Text>
              <Text style={[styles.headerCell, styles.colReq]}>Requirements</Text>
            </View>
            {section.subjects.map((s) => (
              <View key={s.code} style={styles.tableRow}>
                <Text style={styles.colCode}>{s.code}</Text>
                <Text style={styles.colTitle}>{s.title}</Text>
                <Text style={styles.colUnits}>{s.units}</Text>
                <Text style={styles.colReq}>{s.requirementsText}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}