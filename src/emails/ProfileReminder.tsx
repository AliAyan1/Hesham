import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function ProfileReminder({
  name,
  completionPct,
  missingItems,
}: {
  name: string;
  completionPct: number;
  missingItems: string;
}) {
  return (
    <EmailLayout preview="Complete your profile" titleEn="Complete Your Profile" titleAr="أكمل ملفك الشخصي">
      <EmailParagraph en={`Hi ${name}, your profile is ${completionPct}% complete.`} ar={`مرحباً ${name}، اكتمال ملفك ${completionPct}%.`} />
      <Text style={{ color: "#374151", fontSize: 14 }}>Still missing: {missingItems}</Text>
      <EmailCta href={appUrl("/dashboard/job-seeker/profile")} labelEn="Complete Now" labelAr="أكمل الآن" />
    </EmailLayout>
  );
}
