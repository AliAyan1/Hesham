import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function AssessmentComplete({
  name,
  score,
  strength1,
  strength2,
}: {
  name: string;
  score: number;
  strength1?: string;
  strength2?: string;
}) {
  return (
    <EmailLayout
      preview="Your assessment results are ready"
      titleEn="Your Results Are Ready!"
      titleAr="نتائجك جاهزة!"
    >
      <EmailParagraph en={`Hi ${name}, you passed with a strong score.`} ar={`مرحباً ${name}، لقد اجتزت التقييم بنتيجة قوية.`} />
      <Text style={{ fontSize: 32, fontWeight: 700, color: "#1D9E75", textAlign: "center" }}>{score}/100</Text>
      <Text style={{ color: "#059669", textAlign: "center", fontWeight: 600 }}>Passed ✓</Text>
      {(strength1 || strength2) && (
        <Text style={{ color: "#374151", fontSize: 14, lineHeight: 1.8 }}>
          <strong>Top strengths:</strong>
          <br />
          {strength1 ? `• ${strength1}` : null}
          {strength2 ? <><br />• {strength2}</> : null}
        </Text>
      )}
      <EmailCta href={appUrl("/dashboard/job-seeker/assessment")} labelEn="View Full Report" labelAr="عرض التقرير" />
    </EmailLayout>
  );
}
