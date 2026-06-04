import { getTranslations } from "next-intl/server";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminEmployersPage() {
  const t = await getTranslations("adminPanel.usersPage");
  return <AdminUsersClient role="employer" title={t("employersTitle")} />;
}
