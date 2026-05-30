import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function InterviewInvitation({
  jobTitle,
  company,
  interviewId,
  expiresDays = 7,
}: {
  jobTitle: string;
  company: string;
  interviewId?: string;
  expiresDays?: number;
}) {
  const href = interviewId
    ? appUrl(`/dashboard/job-seeker/interview/job?jobId=${encodeURIComponent(interviewId)}`)
    : appUrl("/dashboard/job-seeker/interview");
  return (
    <EmailLayout preview="Video interview waiting" titleEn="You Have a Video Interview!" titleAr="لديك مقابلة فيديو!">
      <EmailParagraph en={`${jobTitle} at ${company}`} ar={`${jobTitle} — ${company}`} />
      <Text style={{ color: "#374151", fontSize: 14 }}>
        Complete within {expiresDays} days. You will answer AI voice questions with camera and screen share enabled.
      </Text>
      <EmailCta href={href} labelEn="Start Interview Now" labelAr="ابدأ المقابلة الآن" />
    </EmailLayout>
  );
}
