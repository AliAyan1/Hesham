import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function WelcomeJobSeeker({ name }: { name: string }) {
  return (
    <EmailLayout
      preview="Welcome to QudrahTech"
      titleEn={`Welcome, ${name}!`}
      titleAr={`مرحباً بك، ${name}!`}
    >
      <EmailParagraph
        en="You're one step closer to matching with top employers across the GCC."
        ar="أنت على بعد خطوة من التواصل مع أفضل أصحاب العمل في المنطقة."
      />
      <Text style={{ color: "#0D2137", fontWeight: 600, fontSize: 14 }}>Get started in 3 steps:</Text>
      <Text style={{ color: "#374151", fontSize: 14, lineHeight: 1.8 }}>
        1. Complete your profile
        <br />
        2. Take the AI assessment
        <br />
        3. Apply to matched jobs
      </Text>
      <EmailCta href={appUrl("/dashboard/job-seeker/profile")} labelEn="Complete Your Profile" labelAr="أكمل ملفك" />
      <EmailCta href={appUrl("/dashboard/job-seeker/assessment")} labelEn="Take AI Assessment" labelAr="ابدأ التقييم" />
    </EmailLayout>
  );
}
