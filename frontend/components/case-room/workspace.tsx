"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
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
  Users,
} from "lucide-react";
import { CaseRoom } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, getStrengthColor } from "@/lib/utils";
import { useCaseRoomStore } from "@/lib/store";
import { api } from "@/lib/api";
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
import { ClientTab } from "@/components/case-room/client-tab";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface WorkspaceProps {
  caseRoom: CaseRoom;
}

const tabItems = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "evidence", label: "Evidence", icon: Shield },
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
  { value: "client", label: "Client", icon: Users },
  { value: "timeline", label: "Timeline", icon: Clock },
];

export function CaseRoomWorkspace({ caseRoom }: WorkspaceProps) {
  const { activeTab, setActiveTab } = useCaseRoomStore();
  const { data: clientUnread = 0 } = useQuery({
    queryKey: ["client-unread", caseRoom.id],
    queryFn: () => api.client.unreadCount(caseRoom.id),
    refetchInterval: 60000,
  });
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.value === "client" && clientUnread > 0 ? (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                    {clientUnread}
                  </Badge>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <ErrorBoundary>
            <OverviewTab caseRoom={caseRoom} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="documents">
          <ErrorBoundary>
            <DocumentsTab caseId={caseRoom.id} caseType={caseRoom.caseType} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="evidence">
          <ErrorBoundary>
            <EvidenceTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="hearings">
          <ErrorBoundary>
            <HearingsTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="deadlines">
          <ErrorBoundary>
            <DeadlinesTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="tasks">
          <ErrorBoundary>
            <TasksTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="discovery">
          <ErrorBoundary>
            <DiscoveryTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="research">
          <ErrorBoundary>
            <ResearchTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="notes">
          <ErrorBoundary>
            <NotesTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="financials">
          <ErrorBoundary>
            <FinancialsTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="analysis">
          <ErrorBoundary>
            <AnalysisTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="draft">
          <ErrorBoundary>
            <DraftTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="chat">
          <ErrorBoundary>
            <ChatTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="client">
          <ErrorBoundary>
            <ClientTab caseRoom={caseRoom} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="timeline">
          <ErrorBoundary>
            <TimelineTab caseId={caseRoom.id} />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
