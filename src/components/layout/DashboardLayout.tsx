import type { ReactNode } from "react";
import type { UserRole } from "@/types";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { DashboardUIProvider } from "@/components/layout/dashboard-ui";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardHydrationGate } from "@/components/layout/DashboardHydrationGate";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";

export interface DashboardLayoutProps {
  locale: string;
  role: UserRole;
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
        <div className="min-h-screen max-w-[100vw] bg-[#F8FAFC] text-gray-900">
          <DashboardNavbar locale={locale} />
          <div className="flex max-w-[100vw] overflow-x-clip">
            <Sidebar locale={locale} role={role} />
            <div className="relative flex min-w-0 flex-1 flex-col ps-0 md:ps-64 md:duration-150">
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
