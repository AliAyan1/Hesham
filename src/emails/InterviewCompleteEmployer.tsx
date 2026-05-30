import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function InterviewCompleteEmployer({
  candidateName,
  score,
  applicationId,
}: {
  candidateName: string;
  score: number;
  applicationId: string;
}) {
  return (
    <EmailLayout preview="Interview ready to review" titleEn="Interview Ready to Review" titleAr="مقابلة جاهزة للمراجعة">
      <EmailParagraph en={`${candidateName} completed their video interview.`} ar={`أكمل ${candidateName} مقابلة الفيديو.`} />
      <Text style={{ fontSize: 24, fontWeight: 700, color: "#0F4C75" }}>Score: {score}/100</Text>
      <EmailCta
        href={appUrl(`/dashboard/employer/candidates/${applicationId}`)}
        labelEn="View Interview Results"
        labelAr="عرض النتائج"
      />
    </EmailLayout>
  );
}
