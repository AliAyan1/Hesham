import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { WrittenReport } from "@/lib/assessment/profilext-types";
import { ALL_TRAITS, TRAIT_LABELS } from "@/lib/assessment/profilext-traits";
import type { TraitScoresMap } from "@/lib/assessment/profilext-types";

Font.register({
  family: "Cairo",
  src: "https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hGA-W1To.ttf",
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#0D2137" },
  coverTitle: { fontSize: 24, color: "#0F4C75", marginTop: 120, fontWeight: "bold" },
  coverSub: { fontSize: 14, color: "#1D9E75", marginTop: 12 },
  coverDate: { fontSize: 11, marginTop: 24, color: "#6B7280" },
  watermark: {
    position: "absolute",
    top: "45%",
    left: "15%",
    fontSize: 36,
    color: "#E5E7EB",
    transform: "rotate(-30deg)",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#6B7280",
  },
  h1: { fontSize: 16, color: "#0F4C75", marginBottom: 8, fontWeight: "bold" },
  h2: { fontSize: 12, color: "#1D9E75", marginTop: 12, marginBottom: 4, fontWeight: "bold" },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 6 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  barLabel: { width: 120, fontSize: 8 },
  barTrack: { flex: 1, height: 8, backgroundColor: "#EEF2F7", borderRadius: 4 },
  barFill: { height: 8, backgroundColor: "#1D9E75", borderRadius: 4 },
});

type PdfProps = {
  candidateName: string;
  completedAt: string;
  traitScores: TraitScoresMap;
  report: WrittenReport;
  thinkingStyleScore: number;
  behavioralScore: number;
  interestsScore: number;
};

export function AssessmentReportPdf({
  candidateName,
  completedAt,
  traitScores,
  report,
  thinkingStyleScore,
  behavioralScore,
  interestsScore,
}: PdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>CONFIDENTIAL</Text>
        <Text style={styles.coverTitle}>QudrahTech Psychometric Assessment</Text>
        <Text style={styles.coverSub}>تقرير التقييم النفسي - قدرتك</Text>
        <Text style={styles.coverTitle}>{candidateName}</Text>
        <Text style={styles.coverDate}>{completedAt}</Text>
        <Text style={styles.footer}>QudrahTech | قدرتك</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>CONFIDENTIAL</Text>
        <Text style={styles.h1}>Trait Summary</Text>
        <Text style={styles.body}>
          Thinking Style Fit: {thinkingStyleScore}% · Behavioral Fit: {behavioralScore}% · Interests Fit:{" "}
          {interestsScore}%
        </Text>
        {ALL_TRAITS.map((trait) => {
          const score = traitScores[trait] ?? 5;
          const label = TRAIT_LABELS[trait];
          return (
            <View key={trait} style={styles.barRow}>
              <Text style={styles.barLabel}>{label.en}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${score * 10}%` }]} />
              </View>
              <Text style={{ width: 24, textAlign: "right", fontSize: 8 }}>{score}</Text>
            </View>
          );
        })}
        <Text style={styles.footer}>QudrahTech | قدرتك</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>CONFIDENTIAL</Text>
        <Text style={styles.h1}>Thinking Style</Text>
        <Text style={styles.body}>{report.thinkingStyle.overallDescription}</Text>
        {Object.entries(report.thinkingStyle.traits).map(([key, trait]) =>
          trait ? (
            <View key={key}>
              <Text style={styles.h2}>
                {trait.title} — {trait.score}/10
              </Text>
              <Text style={styles.body}>{trait.definition}</Text>
              {trait.bulletPoints.map((b) => (
                <Text key={b} style={styles.body}>
                  • {b}
                </Text>
              ))}
            </View>
          ) : null,
        )}
        <Text style={styles.footer}>QudrahTech | قدرتك</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>CONFIDENTIAL</Text>
        <Text style={styles.h1}>Behavioral Traits</Text>
        <Text style={styles.body}>{report.behavioralTraits.overallDescription}</Text>
        {Object.entries(report.behavioralTraits.traits).map(([key, trait]) =>
          trait ? (
            <View key={key}>
              <Text style={styles.h2}>
                {trait.title} — {trait.score}/10
              </Text>
              {trait.bulletPoints.slice(0, 3).map((b) => (
                <Text key={b} style={styles.body}>
                  • {b}
                </Text>
              ))}
            </View>
          ) : null,
        )}
        <Text style={styles.footer}>QudrahTech | قدرتك</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>CONFIDENTIAL</Text>
        <Text style={styles.h1}>Overall Profile & Job Fit</Text>
        <Text style={styles.body}>{report.overallProfile.personalitySummary.slice(0, 800)}</Text>
        <Text style={styles.h2}>Key Strengths</Text>
        {report.overallProfile.keyStrengths.map((s) => (
          <Text key={s} style={styles.body}>
            • {s}
          </Text>
        ))}
        <Text style={styles.h2}>Job Fit</Text>
        {Object.entries(report.jobFitScores).map(([cat, pct]) => (
          <Text key={cat} style={styles.body}>
            {cat}: {pct}%
          </Text>
        ))}
        <Text style={styles.h2}>Top Roles</Text>
        {report.topRecommendedRoles.slice(0, 5).map((r) => (
          <Text key={r.role} style={styles.body}>
            {r.role} — {r.fitPercentage}%
          </Text>
        ))}
        <Text style={styles.footer}>QudrahTech | قدرتك</Text>
      </Page>
    </Document>
  );
}
