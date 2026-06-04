import { getTranslations } from "next-intl/server";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminJobSeekersPage() {
  const t = await getTranslations("adminPanel.usersPage");
  return <AdminUsersClient role="job-seeker" title={t("jobSeekersTitle")} />;
}
