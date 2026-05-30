import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function AssessmentFailed({ name, score, tip }: { name: string; score: number; tip?: string }) {
  return (
    <EmailLayout
      preview="Keep going — retake your assessment"
      titleEn="Keep Going!"
      titleAr="واصل التقدم!"
    >
      <EmailParagraph
        en={`Hi ${name}, your score was ${score}/100. You can retake the assessment to improve.`}
        ar={`مرحباً ${name}، نتيجتك ${score}/100. يمكنك إعادة التقييم للتحسين.`}
      />
      {tip ? <Text style={{ color: "#374151", fontSize: 14 }}>Tip: {tip}</Text> : null}
      <EmailCta href={appUrl("/dashboard/job-seeker/assessment")} labelEn="Retake Assessment" labelAr="أعد التقييم" />
    </EmailLayout>
  );
}
