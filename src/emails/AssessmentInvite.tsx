import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function AssessmentInvite({ name }: { name: string }) {
  return (
    <EmailLayout
      preview="Complete your AI assessment"
      titleEn="Complete Your AI Assessment"
      titleAr="أكمل تقييمك الذكي"
    >
      <EmailParagraph
        en={`Hi ${name}, you are one step away from matching with top employers.`}
        ar={`مرحباً ${name}، أنت على بعد خطوة من التواصل مع أفضل أصحاب العمل.`}
      />
      <Text style={{ color: "#374151", fontSize: 14, lineHeight: 1.8 }}>
        • Stand out with a verified score
        <br />• Unlock job applications
        <br />• Share results with employers
      </Text>
      <EmailCta href={appUrl("/dashboard/job-seeker/assessment")} labelEn="Start Assessment Now" labelAr="ابدأ التقييم الآن" />
    </EmailLayout>
  );
}
