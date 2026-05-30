import type { ReactNode } from "react";
import { UserRole, type UserRole as UserRoleType } from "@/types";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { DashboardUIProvider } from "@/components/layout/dashboard-ui";
import { Sidebar } from "@/components/layout/Sidebar";
import { MentorSidebar } from "@/components/layout/MentorSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardHydrationGate } from "@/components/layout/DashboardHydrationGate";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";

export interface DashboardLayoutProps {
  locale: string;
  role: UserRoleType;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

export function DashboardLayout({
  locale,
  role,
  breadcrumbs,
  children,
}: DashboardLayoutProps) {
  return (
    <DashboardUIProvider>
      <DashboardHydrationGate>
        <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC] text-gray-900">
          <DashboardNavbar locale={locale} />
          {role === UserRole.MENTOR ? (
            <MentorSidebar locale={locale} />
          ) : (
            <Sidebar locale={locale} role={role} />
          )}
          <div className="flex w-full min-w-0">
            {/* In-flow width matches fixed sidebar (w-64) so content aligns and no horizontal scroll */}
            <div className="hidden shrink-0 md:block md:w-64" aria-hidden />
            <div className="relative flex min-w-0 flex-1 flex-col">
              <div className="grow space-y-8 p-4 pb-28 pt-6 md:p-8 md:pb-12">
                <Breadcrumbs items={breadcrumbs} />
                {children}
              </div>
            </div>
          </div>
          <BottomNav locale={locale} role={role} />
        </div>
      </DashboardHydrationGate>
    </DashboardUIProvider>
  );
}
