"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CaseRoom, TimelineEvent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStrengthColor } from "@/lib/utils";

const mockTimeline: TimelineEvent[] = [
  { id: "te-001", title: "FIR Filed", date: "2024-10-15", description: "FIR No. 847/2024 filed at Saket PS", status: "completed" },
  { id: "te-002", title: "Arrest", date: "2024-10-16", description: "Accused arrested and produced before CMM", status: "completed" },
  { id: "te-003", title: "Bail Hearing", date: "2024-10-30", description: "Bail granted by Sessions Court", status: "completed" },
  { id: "te-004", title: "Charge Sheet Filed", date: "2025-01-18", description: "Charge sheet filed under Sections 302, 120B IPC", status: "completed" },
  { id: "te-005", title: "Charges Framed", date: "2025-06-15", description: "Charges framed, accused pleaded not guilty", status: "completed" },
  { id: "te-006", title: "Evidence Stage", date: "2026-03-15", description: "Prosecution evidence — next witness examination", status: "current" },
  { id: "te-007", title: "Arguments", date: "2026-06-01", description: "Final arguments expected", status: "upcoming" },
];

interface OverviewTabProps {
  caseRoom: CaseRoom;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

export function OverviewTab({ caseRoom }: OverviewTabProps) {
  const strengthData = [
    { name: "Strength", value: caseRoom.strength },
    { name: "Remaining", value: 100 - caseRoom.strength },
  ];
  const strengthColor =
    caseRoom.strength >= 75 ? "#22C55E" : caseRoom.strength >= 50 ? "#F59E0B" : "#EF4444";

  const quickStats = [
    { icon: FileText, label: "Documents", value: caseRoom.documentCount, color: "text-info" },
    { icon: AlertTriangle, label: "Loopholes", value: caseRoom.loopholesDetected, color: "text-warning" },
    { icon: CheckCircle, label: "Arguments", value: 12, color: "text-success" },
    { icon: TrendingUp, label: "Research Gaps", value: 3, color: "text-danger" },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left column — main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Case Strength + Quick Stats */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Circular chart */}
                <div className="relative w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={strengthData}
                        innerRadius={55}
                        outerRadius={70}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill={strengthColor} />
                        <Cell fill="#1E1E2E" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getStrengthColor(caseRoom.strength)}`}>
                      {caseRoom.strength}%
                    </span>
                    <span className="text-xs text-muted-foreground">Case Strength</span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-6 flex-1">
                  {quickStats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Procedural Timeline */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Procedural Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-border" />
                <div className="space-y-6">
                  {mockTimeline.map((event) => (
                    <div key={event.id} className="flex gap-4 relative">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          event.status === "completed"
                            ? "bg-success/10 border-2 border-success"
                            : event.status === "current"
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-card border-2 border-border"
                        }`}
                      >
                        {event.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : event.status === "current" ? (
                          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={`font-medium text-sm ${
                              event.status === "upcoming" ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {event.title}
                          </h4>
                          {event.status === "current" && (
                            <Badge variant="default" className="text-[10px]">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Next Hearing */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5 text-primary" />
                Next Hearing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground mb-1">
                {formatDate(caseRoom.nextHearing)}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {caseRoom.stage} — Witness Examination
              </p>
              <Badge variant="warning">Upcoming</Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parties */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                Parties Involved
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {caseRoom.parties.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseRoom.parties.map((party) => (
                <div key={party.id} className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] w-24 justify-center shrink-0">
                    {party.role}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{party.name}</p>
                    {party.notes && (
                      <p className="text-xs text-muted-foreground">{party.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Venue */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-5 h-5 text-primary" />
                Court Venue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{caseRoom.venue}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
