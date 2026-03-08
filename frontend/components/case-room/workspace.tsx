"use client";

import { motion } from "framer-motion";
import {
  Share2,
  Download,
  Archive,
  Calendar,
  MapPin,
  Scale,
  FileText,
  Brain,
  MessageSquare,
  LayoutDashboard,
  FileEdit,
  Clock,
  Gavel,
  CheckSquare,
  StickyNote,
  Shield,
  CalendarClock,
  Search,
  BookOpen,
  DollarSign,
} from "lucide-react";
import { CaseRoom } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, getStrengthColor } from "@/lib/utils";
import { OverviewTab } from "@/components/case-room/overview-tab";
import { DocumentsTab } from "@/components/case-room/documents-tab";
import { AnalysisTab } from "@/components/case-room/analysis-tab";
import { DraftTab } from "@/components/case-room/draft-tab";
import { ChatTab } from "@/components/case-room/chat-tab";
import { TimelineTab } from "@/components/case-room/timeline-tab";
import { HearingsTab } from "@/components/case-room/hearings-tab";
import { TasksTab } from "@/components/case-room/tasks-tab";
import { NotesTab } from "@/components/case-room/notes-tab";
import { EvidenceTab } from "@/components/case-room/evidence-tab";
import { DeadlinesTab } from "@/components/case-room/deadlines-tab";
import { DiscoveryTab } from "@/components/case-room/discovery-tab";
import { ResearchTab } from "@/components/case-room/research-tab";
import { FinancialsTab } from "@/components/case-room/financials-tab";

interface WorkspaceProps {
  caseRoom: CaseRoom;
}

const tabItems = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "evidence", label: "Evidence", icon: Shield },
  { value: "timeline", label: "Timeline", icon: Clock },
  { value: "hearings", label: "Hearings", icon: Gavel },
  { value: "deadlines", label: "Deadlines", icon: CalendarClock },
  { value: "tasks", label: "Tasks", icon: CheckSquare },
  { value: "discovery", label: "Discovery", icon: Search },
  { value: "research", label: "Research", icon: BookOpen },
  { value: "notes", label: "Notes", icon: StickyNote },
  { value: "financials", label: "Financials", icon: DollarSign },
  { value: "analysis", label: "Analysis", icon: Brain },
  { value: "draft", label: "Draft", icon: FileEdit },
  { value: "chat", label: "Chat", icon: MessageSquare },
];

export function CaseRoomWorkspace({ caseRoom }: WorkspaceProps) {
  const strengthVariant =
    caseRoom.strength >= 75 ? "success" : caseRoom.strength >= 50 ? "warning" : "destructive";

  return (
    <div className="max-w-container mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{caseRoom.title}</h1>
              <Badge variant={strengthVariant}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${getStrengthColor(caseRoom.strength).replace("text-", "bg-")}`} />
                {caseRoom.strength}% Strength
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                {caseRoom.caseNumber}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {caseRoom.court}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Next: {formatDate(caseRoom.nextHearing)}
              </span>
              <Badge variant="secondary" className="text-xs">{caseRoom.caseType}</Badge>
              <Badge variant="outline" className="text-xs">{caseRoom.stage}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab caseRoom={caseRoom} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="hearings">
          <HearingsTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="deadlines">
          <DeadlinesTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="discovery">
          <DiscoveryTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="research">
          <ResearchTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="financials">
          <FinancialsTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="analysis">
          <AnalysisTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="draft">
          <DraftTab caseId={caseRoom.id} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatTab caseId={caseRoom.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
