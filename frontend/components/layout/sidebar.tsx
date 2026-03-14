"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Calendar,
  BookOpen,
  Settings,
  ChevronLeft,
  Scale,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/case-rooms", label: "Case Rooms", icon: FolderOpen },
  { href: "/dashboard/drafts", label: "Drafts", icon: FileText },
  { href: "/dashboard/hearings", label: "Hearings", icon: Calendar },
  { href: "/dashboard/legal-database", label: "Legal Database", icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications.getAll(),
    refetchInterval: 60000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => api.notifications.getUnreadCount(),
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => api.notifications.markRead(notificationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] }),
      ]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] }),
      ]);
    },
  });

  const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);

  const buildNotificationHref = (n: { caseId?: string; notificationType: string }) => {
    if (!n.caseId) return "/dashboard";
    if (n.notificationType === "client_profile_complete") {
      return `/dashboard/case-rooms/${n.caseId}?tab=client&section=profile`;
    }
    if (n.notificationType === "client_document_uploaded") {
      return `/dashboard/case-rooms/${n.caseId}?tab=client&section=document-requests`;
    }
    if (n.notificationType === "client_message_received") {
      return `/dashboard/case-rooms/${n.caseId}?tab=client&section=messages`;
    }
    return `/dashboard/case-rooms/${n.caseId}`;
  };

  const handleNotificationClick = async (n: { id: string; caseId?: string; notificationType: string; isRead: boolean }) => {
    if (!n.isRead) {
      await markReadMutation.mutateAsync(n.id);
    }
    setNotifOpen(false);
    router.push(buildNotificationHref(n));
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 h-screen bg-secondary border-r border-border z-50 flex flex-col",
          "max-lg:hidden"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-foreground overflow-hidden whitespace-nowrap"
                >
                  KanoonEdge
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform",
                !sidebarOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          <div className="relative mb-2">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-200"
            >
              <Bell className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Notifications
                  </motion.span>
                )}
              </AnimatePresence>
              {unreadCount > 0 ? (
                <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-[10px]">
                  {unreadCount}
                </Badge>
              ) : null}
            </button>

            {notifOpen ? (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-border bg-background shadow-md z-50 max-h-80 overflow-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-foreground">Notifications</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending || unreadCount === 0}
                  >
                    Mark all read
                  </Button>
                </div>
                {visibleNotifications.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground">No notifications yet.</p>
                ) : (
                  visibleNotifications.map((n) => (
                    <button
                      key={n.id}
                      className={cn(
                        "w-full text-left px-3 py-2 border-b border-border/60 hover:bg-secondary/40",
                        !n.isRead && "bg-secondary/20"
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">AR</AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm font-medium text-foreground whitespace-nowrap">
                    Advocate Rahul
                  </p>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    PRO
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-border z-50 lg:hidden">
        <nav className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
