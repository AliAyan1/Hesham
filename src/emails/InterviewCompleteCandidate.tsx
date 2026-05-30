import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function InterviewCompleteCandidate({ score }: { score: number }) {
  return (
    <EmailLayout preview="Interview complete" titleEn="Interview Complete!" titleAr="اكتملت مقابلتك!">
      <EmailParagraph en="Your AI interview has been analyzed." ar="تم تحليل مقابلتك بالذكاء الاصطناعي." />
      <Text style={{ fontSize: 28, fontWeight: 700, color: "#1D9E75", textAlign: "center" }}>{score}/100</Text>
      <EmailCta href={appUrl("/dashboard/job-seeker/interview")} labelEn="View Full Results" labelAr="عرض النتائج" />
    </EmailLayout>
  );
}
