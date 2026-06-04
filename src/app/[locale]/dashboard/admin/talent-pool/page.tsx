import { getTranslations } from "next-intl/server";
import { TalentPoolAdminPageClient } from "./TalentPoolAdminPageClient";

export default async function AdminTalentPoolPage() {
  const t = await getTranslations("adminPanel.talentPoolPage");
  return <TalentPoolAdminPageClient title={t("title")} />;
}
