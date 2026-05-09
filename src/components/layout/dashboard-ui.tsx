"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type DashboardUIContextValue = {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: Dispatch<SetStateAction<boolean>>;
  toggleMobileSidebar: () => void;
};

const DashboardUIContext = createContext<DashboardUIContextValue | null>(null);

export function DashboardUIProvider({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((v) => !v);
  }, []);
  const value = useMemo(
    () => ({ mobileSidebarOpen, setMobileSidebarOpen, toggleMobileSidebar }),
    [mobileSidebarOpen, toggleMobileSidebar],
  );

  return <DashboardUIContext.Provider value={value}>{children}</DashboardUIContext.Provider>;
}

export function useDashboardUI(): DashboardUIContextValue {
  const v = useContext(DashboardUIContext);
  if (!v) throw new Error("useDashboardUI must be used inside DashboardUIProvider");
  return v;
}
