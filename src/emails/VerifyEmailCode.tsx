import { Text } from "@react-email/components";
import { EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";

type Props = {
  name: string;
  code: string;
};

export function VerifyEmailCode({ name, code }: Props) {
  return (
    <EmailLayout
      preview="Verify your email"
      titleEn="Verify your email"
      titleAr="تأكيد بريدك الإلكتروني"
    >
      <EmailParagraph
        en={`Hi ${name}, use this code to verify your email address:`}
        ar={`مرحباً ${name}، استخدم هذا الرمز لتأكيد بريدك الإلكتروني:`}
      />
      <Text
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: 8,
          textAlign: "center",
          color: "#0F4C75",
          margin: "24px 0",
        }}
      >
        {code}
      </Text>
      <EmailParagraph
        en="This code expires in 10 minutes. If you did not create an account, you can ignore this email."
        ar="ينتهي هذا الرمز خلال 10 دقائق. إذا لم تنشئ حساباً، تجاهل هذه الرسالة."
      />
    </EmailLayout>
  );
}
