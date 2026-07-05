import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ensureAdminPage } from "@/lib/admin/require-admin";

export default async function AdminDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await ensureAdminPage(locale);

  const userName = session.user.name ?? session.user.email ?? "Admin";
  const userEmail = session.user.email ?? "";

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC]">
      <div className="flex w-full min-w-0">
        <AdminSidebar userName={userName} userEmail={userEmail} />
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">{children}</main>
      </div>
    </div>
  );
}
