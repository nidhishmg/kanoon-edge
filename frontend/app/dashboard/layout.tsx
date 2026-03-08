"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAppStore } from "@/lib/store";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className="transition-all duration-200 max-lg:pl-0 max-lg:pb-20"
        style={{ paddingLeft: sidebarOpen ? 240 : 72 }}
      >
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
