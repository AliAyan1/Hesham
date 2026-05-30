import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function PaymentConfirmed({
  amount,
  currency,
  jobTitle,
  receiptNumber,
}: {
  amount: number;
  currency: string;
  jobTitle: string;
  receiptNumber: string;
}) {
  return (
    <EmailLayout preview="Payment confirmed" titleEn="Payment Confirmed" titleAr="تم تأكيد الدفع">
      <EmailParagraph en={`Recruitment payment for ${jobTitle}`} ar={`دفع رسوم التوظيف — ${jobTitle}`} />
      <Text style={{ fontSize: 20, fontWeight: 700 }}>{amount} {currency}</Text>
      <Text style={{ color: "#374151" }}>Receipt: {receiptNumber}</Text>
      <EmailCta href={appUrl("/dashboard/employer")} labelEn="View Dashboard" labelAr="لوحة التحكم" />
    </EmailLayout>
  );
}
