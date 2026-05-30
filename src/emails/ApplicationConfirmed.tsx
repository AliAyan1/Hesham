import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function ApplicationConfirmed({
  jobTitle,
  company,
  appliedAt,
}: {
  jobTitle: string;
  company: string;
  appliedAt: string;
}) {
  return (
    <EmailLayout preview="Application submitted" titleEn="Application Submitted!" titleAr="تم إرسال طلبك!">
      <EmailParagraph en={`${jobTitle} — ${company}`} ar={`${jobTitle} — ${company}`} />
      <Text style={{ color: "#374151", fontSize: 14 }}>Applied: {appliedAt}</Text>
      <Text style={{ color: "#374151", fontSize: 14 }}>The employer will review your profile and assessment.</Text>
      <EmailCta href={appUrl("/dashboard/job-seeker/applications")} labelEn="View Application" labelAr="عرض الطلب" />
    </EmailLayout>
  );
}
