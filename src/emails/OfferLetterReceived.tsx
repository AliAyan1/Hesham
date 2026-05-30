import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function OfferLetterReceived({
  company,
  jobTitle,
  offerId,
}: {
  company: string;
  jobTitle: string;
  offerId: string;
}) {
  return (
    <EmailLayout preview="Job offer" titleEn="You Have Received a Job Offer!" titleAr="لديك عرض عمل!">
      <EmailParagraph en={`${company} — ${jobTitle}`} ar={`${company} — ${jobTitle}`} />
      <EmailCta href={appUrl(`/dashboard/job-seeker/offers/${offerId}`)} labelEn="Review Offer" labelAr="مراجعة العرض" />
    </EmailLayout>
  );
}
