import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function NewMessage({
  senderName,
  preview,
  threadId,
  role,
}: {
  senderName: string;
  preview: string;
  threadId: string;
  role: "JOBSEEKER" | "EMPLOYER";
}) {
  const href =
    role === "EMPLOYER"
      ? appUrl(`/dashboard/employer/messages?thread=${threadId}`)
      : appUrl(`/dashboard/job-seeker/messages?thread=${threadId}`);
  return (
    <EmailLayout preview="New message" titleEn="New Message on QudrahTech" titleAr="رسالة جديدة">
      <EmailParagraph en={`From ${senderName}`} ar={`من ${senderName}`} />
      <Text style={{ color: "#374151", fontSize: 14, fontStyle: "italic" }}>{preview.slice(0, 100)}…</Text>
      <EmailCta href={href} labelEn="View Message" labelAr="عرض الرسالة" />
    </EmailLayout>
  );
}
