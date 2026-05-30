import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function NewJobMatch({
  jobTitle,
  company,
  matchPercent,
  requirements,
}: {
  jobTitle: string;
  company: string;
  matchPercent: number;
  requirements?: string;
}) {
  return (
    <EmailLayout preview="New job match" titleEn="New Job Match!" titleAr="وظيفة جديدة تناسبك!">
      <EmailParagraph en={`${jobTitle} at ${company}`} ar={`${jobTitle} — ${company}`} />
      <Text style={{ fontSize: 22, fontWeight: 700, color: "#0F4C75" }}>{matchPercent}% match</Text>
      {requirements ? <Text style={{ color: "#374151", fontSize: 14 }}>{requirements}</Text> : null}
      <EmailCta href={appUrl("/dashboard/job-seeker/jobs")} labelEn="View & Apply" labelAr="عرض والتقديم" />
    </EmailLayout>
  );
}
