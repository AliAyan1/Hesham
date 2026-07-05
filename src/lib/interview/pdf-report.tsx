import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { EnhancedInterviewReport } from "@/lib/interview/enhanced-report-types";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#0D2137" },
  watermark: {
    position: "absolute",
    top: "45%",
    left: "10%",
    fontSize: 28,
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
  h1: { fontSize: 18, color: "#0F4C75", marginBottom: 8, fontWeight: "bold" },
  h2: { fontSize: 12, color: "#1D9E75", marginTop: 10, marginBottom: 4, fontWeight: "bold" },
  body: { fontSize: 10, lineHeight: 1.45, marginBottom: 6 },
  badge: { fontSize: 11, color: "#1D9E75", marginBottom: 8 },
});

type Props = {
  candidateName: string;
  jobTitle: string;
  completedAt: string;
  report: EnhancedInterviewReport;
  locale: "en" | "ar";
};

export function InterviewReportPdf({ candidateName, jobTitle, completedAt, report, locale }: Props) {
  const isAr = locale === "ar";
  const summary = isAr ? report.executiveSummary.summaryAR : report.executiveSummary.summaryEN;
  const comm = isAr ? report.communicationAnalysis.detailAR : report.communicationAnalysis.detailEN;
  const facial = isAr
    ? report.facialExpressionAnalysis.facialSummaryAR
    : report.facialExpressionAnalysis.facialSummaryEN;
  const finalRec = isAr
    ? report.hiringManagerNotes.finalRecommendationAR
    : report.hiringManagerNotes.finalRecommendationEN;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>Confidential — QudrahTech</Text>
        <Text style={styles.h1}>QudrahTech AI Interview Report</Text>
        <Text style={styles.body}>{candidateName}</Text>
        <Text style={styles.body}>{jobTitle}</Text>
        <Text style={styles.body}>{completedAt}</Text>
        <Text style={styles.badge}>
          {report.executiveSummary.hiringRecommendation.replace(/_/g, " ")} ·{" "}
          {report.executiveSummary.overallRating}/10
        </Text>
        <Text style={styles.body}>{summary}</Text>
        <Text style={styles.footer}>QudrahTech | {candidateName}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>Confidential — QudrahTech</Text>
        <Text style={styles.h2}>Scores</Text>
        <Text style={styles.body}>Communication: {report.communicationAnalysis.score}/10</Text>
        <Text style={styles.body}>Content: {report.contentAnalysis.score}/10</Text>
        <Text style={styles.body}>Behavioral: {report.behavioralAnalysis.score}/10</Text>
        <Text style={styles.body}>
          Facial confidence: {report.facialExpressionAnalysis.overallConfidenceScore}/10
        </Text>
        <Text style={styles.body}>Role fit: {report.roleCompatibility.overallFit}/10</Text>
        <Text style={styles.h2}>Communication</Text>
        <Text style={styles.body}>{comm}</Text>
        <Text style={styles.footer}>Page 2</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>Confidential — QudrahTech</Text>
        <Text style={styles.h2}>Facial / Non-verbal Analysis</Text>
        <Text style={styles.body}>{facial}</Text>
        <Text style={styles.body}>{report.facialExpressionAnalysis.eyeContactAssessment}</Text>
        <Text style={styles.body}>{report.facialExpressionAnalysis.postureAssessment}</Text>
        <Text style={styles.footer}>Page 3</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>Confidential — QudrahTech</Text>
        <Text style={styles.h2}>Hiring Manager Notes</Text>
        <Text style={styles.body}>{finalRec}</Text>
        {report.hiringManagerNotes.suggestedFollowUpQuestions.map((q, i) => (
          <Text key={i} style={styles.body}>
            {i + 1}. {q}
          </Text>
        ))}
        <Text style={styles.footer}>Page 4</Text>
      </Page>
    </Document>
  );
}
