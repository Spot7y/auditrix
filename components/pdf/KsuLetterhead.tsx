import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

// The KSU letterhead and signature lines shared by Auditrix's printed documents.

export const PDF_GREEN = "#14532d";
export const PDF_MUTED = "#5b6660";
export const PDF_LINE = "#c9d1cc";

const styles = StyleSheet.create({
  letterhead: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  seal: { width: 54, height: 54, marginRight: 12 },
  letterText: { alignItems: "center" },
  republic: { fontSize: 8.5, color: PDF_MUTED },
  university: { fontSize: 14, fontFamily: "Helvetica-Bold", color: PDF_GREEN, marginTop: 1 },
  college: { fontSize: 9.5, marginTop: 1 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: PDF_GREEN, marginTop: 4 },

  signature: { width: "30%" },
  signatureCaption: { fontSize: 7.5, color: PDF_MUTED, marginBottom: 22 },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: "#1d2420", paddingTop: 2, alignItems: "center" },
  signatureName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, minHeight: 10 },
  signatureRole: { fontSize: 7.5, color: PDF_MUTED },
});

/** The university seal and name, with the college under it, and a rule. */
export function KsuLetterhead({ sealPath, college }: { sealPath: string; college: string | null }) {
  return (
    <>
      <View style={styles.letterhead}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
        <Image src={sealPath} style={styles.seal} />
        <View style={styles.letterText}>
          <Text style={styles.republic}>Republic of the Philippines</Text>
          <Text style={styles.university}>KALINGA STATE UNIVERSITY</Text>
          {college && <Text style={styles.college}>{college}</Text>}
        </View>
      </View>
      <View style={styles.rule} />
    </>
  );
}

/** A signature line: caption above, printed name and role below. */
export function Signature({ caption, name, role }: { caption: string; name: string; role: string }) {
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
