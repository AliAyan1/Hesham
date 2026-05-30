import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function TalentPoolAdded({ name, reason }: { name: string; reason: string }) {
  return (
    <EmailLayout preview="Talent pool" titleEn="You Are in Our Talent Pool" titleAr="أنت في مجموعة المواهب">
      <EmailParagraph
        en={`Hi ${name}, we've added you to our talent pool to help you grow.`}
        ar={`مرحباً ${name}، أضفناك إلى مجموعة المواهب لدعم تطورك.`}
      />
      <Text style={{ color: "#374151", fontSize: 14 }}>Reason: {reason}</Text>
      <Text style={{ color: "#374151", fontSize: 14 }}>
        Improve your assessment or interview score, complete your profile, and retake when ready.
      </Text>
      <EmailCta href={appUrl("/dashboard/job-seeker/profile")} labelEn="Improve Your Profile" labelAr="حسّن ملفك" />
    </EmailLayout>
  );
}
