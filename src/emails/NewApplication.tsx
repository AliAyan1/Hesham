import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function NewApplication({
  candidateName,
  jobTitle,
  assessmentScore,
  applicationId,
}: {
  candidateName: string;
  jobTitle: string;
  assessmentScore?: number | null;
  applicationId: string;
}) {
  return (
    <EmailLayout preview="New application" titleEn="New Application Received" titleAr="طلب جديد">
      <EmailParagraph en={`${candidateName} applied for ${jobTitle}.`} ar={`تقدم ${candidateName} على ${jobTitle}.`} />
      {assessmentScore != null ? (
        <Text style={{ color: "#374151" }}>Assessment score: {assessmentScore}/100</Text>
      ) : null}
      <EmailCta
        href={appUrl(`/dashboard/employer/candidates/${applicationId}`)}
        labelEn="Review Application"
        labelAr="مراجعة الطلب"
      />
    </EmailLayout>
  );
}
