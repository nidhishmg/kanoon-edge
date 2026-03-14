"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  ChevronRight,
  X,
  Lightbulb,
  MessageSquare,
  PenTool,
  Search,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CaseRoom, TimelineEvent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getStrengthColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { useCaseRoomStore } from "@/lib/store";

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
  const setActiveTab = useCaseRoomStore((s) => s.setActiveTab);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [dismissedRecs, setDismissedRecs] = useState<string[]>(caseRoom.dismissedRecommendations || []);

  useEffect(() => {
    api.timeline.getByCase(caseRoom.id).then(setTimeline).catch(() => {});
  }, [caseRoom.id]);

  const handleDismiss = async (recId: string) => {
    try {
      await api.caseRooms.dismissRecommendation(caseRoom.id, recId);
      setDismissedRecs((prev) => [...prev, recId]);
    } catch {}
  };

  const recommendations = (caseRoom.recommendations || []).filter(
    (r) => !dismissedRecs.includes(r.id)
  );

  const strengthData = [
    { name: "Strength", value: caseRoom.strength },
    { name: "Remaining", value: 100 - caseRoom.strength },
  ];
  const strengthColor =
    caseRoom.strength >= 75 ? "#22C55E" : caseRoom.strength >= 50 ? "#F59E0B" : "#EF4444";

  // Hearing countdown
  const daysToHearing = caseRoom.daysToNextHearing;
  const hearingUrgency =
    daysToHearing !== undefined && daysToHearing !== null
      ? daysToHearing <= 3
        ? "destructive"
        : "secondary"
      : "secondary";

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Strength + Quick Stats */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
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

                <div className="grid grid-cols-2 gap-6 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                      <FileText className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{caseRoom.documentCount}</p>
                      <p className="text-xs text-muted-foreground">Documents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{caseRoom.loopholesDetected}</p>
                      <p className="text-xs text-muted-foreground">Loopholes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{caseRoom.taskCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{caseRoom.hearingCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Hearings</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Recommendations
                  <Badge variant="secondary" className="ml-auto text-[10px]">{recommendations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rec.action}</p>
                      <p className="text-xs text-muted-foreground">{rec.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rec.tab && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setActiveTab(rec.tab!)}
                        >
                          {rec.button || "Go"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => handleDismiss(rec.id)}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Date Insights */}
        {(caseRoom.firDelayDays || caseRoom.custodyDays || caseRoom.chargeSheetDeadlineDays !== undefined) && (
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-5 h-5 text-primary" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {caseRoom.firDelayDays !== undefined && caseRoom.firDelayDays !== null && caseRoom.firDelayDays > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${caseRoom.firDelayDays > 2 ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    <Clock className="w-4 h-4" />
                    FIR filed {caseRoom.firDelayDays} days after incident
                    {caseRoom.firDelayDays > 2 && " — defence argument"}
                  </div>
                )}
                {caseRoom.custodyDays !== undefined && caseRoom.custodyDays !== null && caseRoom.custodyDays > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${caseRoom.custodyDays > 60 ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    <Shield className="w-4 h-4" />
                    In custody for {caseRoom.custodyDays} days
                    {caseRoom.custodyDays > 60 && " — check default bail"}
                  </div>
                )}
                {caseRoom.chargeSheetDeadlineDays !== undefined && caseRoom.chargeSheetDeadlineDays !== null && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${caseRoom.chargeSheetDeadlineDays <= 0 ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}`}>
                    <Calendar className="w-4 h-4" />
                    {caseRoom.chargeSheetDeadlineDays <= 0
                      ? "Charge sheet deadline exceeded — default bail eligible"
                      : `${caseRoom.chargeSheetDeadlineDays} days until charge sheet deadline`}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No timeline events yet. Events are auto-generated from case dates.
                </p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-border" />
                  <div className="space-y-6">
                    {timeline
                      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
                      .map((event) => (
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
                              <h4 className={`font-medium text-sm ${event.status === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>
                                {event.title}
                              </h4>
                              {event.status === "upcoming" && (
                                <Badge variant="secondary" className="text-[10px]">Upcoming</Badge>
                              )}
                              {event.autoGenerated && (
                                <Badge variant="outline" className="text-[10px]">Auto</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(event.eventDate)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Next Hearing */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5 text-primary" />
                Next Hearing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseRoom.nextHearing ? (
                <>
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {formatDate(caseRoom.nextHearing)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {caseRoom.hearingPurpose || caseRoom.stage}
                  </p>
                  {daysToHearing !== undefined && daysToHearing !== null && (
                    <Badge variant={hearingUrgency as "destructive" | "warning" | "secondary"}>
                      {daysToHearing <= 0 ? "Today / Overdue" : `${daysToHearing} day${daysToHearing !== 1 ? "s" : ""} away`}
                    </Badge>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No hearing scheduled</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Parties */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                Parties
                <Badge variant="secondary" className="ml-auto text-[10px]">{caseRoom.parties.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseRoom.parties.map((party) => (
                <div key={party.id} className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] w-24 justify-center shrink-0">{party.role}</Badge>
                  <span className="text-sm text-foreground truncate">{party.name}</span>
                </div>
              ))}
              {caseRoom.parties.length === 0 && (
                <p className="text-sm text-muted-foreground">No parties added</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveTab("analysis")}>
                <Search className="w-4 h-4" /> Run Analysis
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveTab("drafts")}>
                <PenTool className="w-4 h-4" /> Prepare Draft
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveTab("chat")}>
                <MessageSquare className="w-4 h-4" /> Ask AI
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Case Details */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {caseRoom.caseNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number</span>
                  <span className="text-foreground">{caseRoom.caseNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground">{caseRoom.caseType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage</span>
                <span className="text-foreground">{caseRoom.stage}</span>
              </div>
              {caseRoom.courtLevel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Court Level</span>
                  <span className="text-foreground">{caseRoom.courtLevel}</span>
                </div>
              )}
              {caseRoom.lawyerSide && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Representing</span>
                  <span className="text-foreground capitalize">{caseRoom.lawyerSide}</span>
                </div>
              )}
              {caseRoom.court && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Court</span>
                  <span className="text-foreground">{caseRoom.court}</span>
                </div>
              )}
              {caseRoom.clientName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="text-foreground">{caseRoom.clientName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
