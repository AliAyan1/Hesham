import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function WelcomeEmployer({ name }: { name: string }) {
  return (
    <EmailLayout
      preview="Welcome to QudrahTech — hire smarter"
      titleEn={`Welcome, ${name}!`}
      titleAr={`مرحباً بك، ${name}!`}
    >
      <EmailParagraph
        en="Post jobs, review AI-assessed candidates, and hire with confidence."
        ar="انشر الوظائف، راجع المرشحين المُقيّمين بالذكاء الاصطناعي، ووظّف بثقة."
      />
      <EmailCta href={appUrl("/dashboard/employer/post-job")} labelEn="Post Your First Job" labelAr="انشر أول وظيفة" />
    </EmailLayout>
  );
}
