import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function TalentPoolNominated({ company, jobTitle }: { company: string; jobTitle: string }) {
  return (
    <EmailLayout preview="Employer interested" titleEn="An Employer is Interested!" titleAr="صاحب عمل مهتم بك!">
      <EmailParagraph en={`${company} is interested in you for ${jobTitle}.`} ar={`${company} مهتم بك لوظيفة ${jobTitle}.`} />
      <EmailCta href={appUrl("/dashboard/job-seeker/invites")} labelEn="View Invitation" labelAr="عرض الدعوة" />
    </EmailLayout>
  );
}
