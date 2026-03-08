"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FolderOpen,
  Calendar,
  Brain,
  FileText,
  Plus,
  Search,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getGreeting, formatDate, getStrengthColor } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

const statIcons = [FolderOpen, Calendar, Brain, FileText];
const statLabels = ["Case Rooms", "Hearings Today", "AI Analyses", "Drafts Generated"];

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: api.dashboard.getStats,
  });

  const { data: caseRooms, isLoading: casesLoading } = useQuery({
    queryKey: ["case-rooms"],
    queryFn: api.caseRooms.getAll,
  });

  const statValues = stats
    ? [stats.caseRooms, stats.hearingsToday, stats.aiAnalyses, stats.draftsGenerated]
    : [];

  return (
    <div className="max-w-container mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          {getGreeting()}, <span className="text-gradient">Advocate Rahul</span>
        </h1>
        <p className="text-muted-foreground">
          {"Here's what's happening with your cases today."}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px]" />
            ))
          : statLabels.map((label, i) => {
              const Icon = statIcons[i];
              return (
                <motion.div
                  key={label}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                >
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {statValues[i]}
                      </p>
                      <p className="text-sm text-muted-foreground">{label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {/* Case Rooms Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Your Case Rooms</h2>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search cases..." className="pl-9 w-[240px]" />
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Case Room
          </Button>
        </div>
      </div>

      {/* Case Room Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {casesLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px]" />
            ))
          : caseRooms?.map((caseRoom, i) => (
              <motion.div
                key={caseRoom.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <Link href={`/dashboard/case-rooms/${caseRoom.id}`}>
                  <Card className="hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {caseRoom.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {caseRoom.caseNumber} — {caseRoom.court}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary">{caseRoom.caseType}</Badge>
                        <Badge variant="outline">{caseRoom.stage}</Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {caseRoom.documentCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Docs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-warning">
                            {caseRoom.loopholesDetected}
                          </p>
                          <p className="text-xs text-muted-foreground">Loopholes</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${getStrengthColor(caseRoom.strength)}`}>
                            {caseRoom.strength}%
                          </p>
                          <p className="text-xs text-muted-foreground">Strength</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(caseRoom.nextHearing)}
                          </p>
                          <p className="text-xs text-muted-foreground">Hearing</p>
                        </div>
                      </div>

                      {/* Strength bar */}
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            caseRoom.strength >= 75
                              ? "bg-success"
                              : caseRoom.strength >= 50
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          style={{ width: `${caseRoom.strength}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
      </div>
    </div>
  );
}
