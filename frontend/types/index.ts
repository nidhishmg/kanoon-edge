// ─── Case Room ───────────────────────────────────────────────

export type CaseType = "Criminal" | "Civil" | "Civil - Tax" | "Civil - Property" | "Corporate" | "Family" | "Property" | "Other";
export type CaseStage = "Investigation" | "Bail Stage" | "Evidence" | "Arguments" | "Trial" | "Mediation" | "Discovery" | "Appeal" | "Judgment Pending";
export type PartyRole = "Accused" | "Petitioner" | "Respondent" | "Complainant" | "Witness" | "Lawyer";

export interface Party {
  id: string;
  name: string;
  role: PartyRole;
  notes?: string;
}

export interface CaseRoom {
  id: string;
  title: string;
  caseNumber: string;
  court: string;
  caseType: CaseType;
  stage: CaseStage;
  documentCount: number;
  loopholesDetected: number;
  nextHearing: string;
  strength: number;
  status: "active" | "archived" | "pending";
  createdAt: string;
  parties: Party[];
  venue: string;
}

// ─── Wizard ──────────────────────────────────────────────────

export interface CaseWizardData {
  caseInfo: {
    title: string;
    caseNumber: string;
    court: string;
    caseType: CaseType;
    stage: CaseStage;
    nextHearing: string;
  };
  parties: Party[];
  documents: File[];
}

// ─── Documents ───────────────────────────────────────────────

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: "uploaded" | "processing" | "analyzed" | "error";
  pages: number;
}

// ─── Analysis ────────────────────────────────────────────────

export interface AnalysisResult {
  id: string;
  type: "loophole" | "contradiction" | "argument" | "gap";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  legalBasis: string;
  guidance: string;
  documentRef: string;
  page: number;
}

export type AnalysisStage =
  | "reading"
  | "extracting"
  | "compliance"
  | "contradictions"
  | "precedents"
  | "timeline";

export interface AnalysisProgress {
  stage: AnalysisStage;
  label: string;
  complete: boolean;
}

// ─── Chat ────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export interface Citation {
  document: string;
  page: number;
  text: string;
}

// ─── Drafts ──────────────────────────────────────────────────

export interface DraftTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

// ─── Timeline ────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status: "completed" | "current" | "upcoming";
}

// ─── Dashboard ───────────────────────────────────────────────

export interface DashboardStats {
  caseRooms: number;
  hearingsToday: number;
  aiAnalyses: number;
  draftsGenerated: number;
}

// ─── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "enterprise";
  avatar?: string;
}
