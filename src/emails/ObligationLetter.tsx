import { Text } from "@react-email/components";
import { EmailCta, EmailLayout, EmailParagraph } from "@/emails/components/EmailLayout";
import { appUrl } from "@/lib/email/app-url";

export function ObligationLetterEmail({
  candidateName,
  jobTitle,
  fee,
  currency,
  obligationId,
}: {
  candidateName: string;
  jobTitle: string;
  fee: number;
  currency: string;
  obligationId: string;
}) {
  return (
    <EmailLayout preview="Sign obligation letter" titleEn="Sign Your Obligation Letter" titleAr="وقّع خطاب الالتزام">
      <EmailParagraph
        en={`Please sign the recruitment obligation for hiring ${candidateName} — ${jobTitle}.`}
        ar={`يرجى توقيع خطاب الالتزام لتوظيف ${candidateName} — ${jobTitle}.`}
      />
      <Text style={{ fontSize: 18, fontWeight: 700, color: "#0F4C75" }}>
        Fee: {fee} {currency}
      </Text>
      <EmailCta
        href={appUrl(`/dashboard/employer/obligation/${obligationId}`)}
        labelEn="Sign Now"
        labelAr="وقّع الآن"
      />
    </EmailLayout>
  );
}
