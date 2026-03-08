"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!api.auth.isAuthenticated()) {
      router.replace("/auth/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

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
