import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function ApplicationStatus({
  jobTitle,
  status,
  messageEn,
  messageAr,
  declineReason,
}: {
  jobTitle: string;
  status: string;
  messageEn: string;
  messageAr: string;
  declineReason?: string;
}) {
  return (
    <EmailLayout preview="Application update" titleEn="Application Update" titleAr="تحديث على طلبك">
      <EmailParagraph en={`${jobTitle} — Status: ${status}`} ar={`${jobTitle} — الحالة: ${status}`} />
      <EmailParagraph en={messageEn} ar={messageAr} />
      {declineReason ? (
        <EmailParagraph en={`Reason: ${declineReason}`} ar={`السبب: ${declineReason}`} />
      ) : null}
      <EmailCta href={appUrl("/dashboard/job-seeker/applications")} labelEn="View Applications" labelAr="عرض الطلبات" />
    </EmailLayout>
  );
}
