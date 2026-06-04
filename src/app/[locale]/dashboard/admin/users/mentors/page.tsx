import { getTranslations } from "next-intl/server";
import AdminMentorsPageClient from "./AdminMentorsPageClient";

export default async function AdminMentorsUsersPage() {
  const t = await getTranslations("adminPanel.usersPage");
  return <AdminMentorsPageClient title={t("mentorsTitle")} />;
}
