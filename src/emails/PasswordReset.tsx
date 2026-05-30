import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";

export function PasswordReset({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailLayout preview="Reset password" titleEn="Reset Your Password" titleAr="إعادة تعيين كلمة المرور">
      <EmailParagraph
        en="Click below to reset your password. This link expires in 1 hour."
        ar="انقر أدناه لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة."
      />
      <EmailCta href={resetUrl} labelEn="Reset Password" labelAr="إعادة التعيين" />
      <Text style={{ color: "#6B7280", fontSize: 12 }}>If you did not request this, ignore this email.</Text>
    </EmailLayout>
  );
}
