// ─── Case Room ───────────────────────────────────────────────

export type CaseType = "Criminal" | "Civil" | "Civil - Tax" | "Civil - Property" | "Corporate" | "Family" | "Property" | "Bail" | "Writ" | "Labour" | "Other";
export type CaseStage = "Investigation" | "Pre-Arrest" | "Bail Stage" | "Bail" | "Charge Framing" | "Evidence" | "Arguments" | "Trial" | "Mediation" | "Discovery" | "Appeal" | "Judgment Pending";
export type PartyRole = "Accused" | "Petitioner" | "Respondent" | "Complainant" | "Witness" | "Lawyer";
export type CourtLevel = "Magistrate" | "Sessions" | "High Court" | "Supreme Court" | "Tribunal" | "Other";
export type LawyerSide = "defence" | "prosecution" | "petitioner" | "respondent";
export type ChecklistValue = "yes" | "no" | "unknown";

export interface Recommendation {
  id: string;
  action: string;
  reason: string;
  button?: string;
  tab?: string;
}

export interface SectionClassification {
  raw: string;
  code: string;
  section: string;
  title: string;
  max_punishment: string;
  bailable: string;
  cognizable: string;
  over_7_years: boolean;
  found: boolean;
}

export interface Party {
  id: string;
  name: string;
  role: PartyRole;
  notes?: string;
  partyType?: string;
  advocateName?: string;
  barCouncilNumber?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
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
  // Existing fields
  filingDate?: string;
  filingNumber?: string;
  firNumber?: string;
  policeStation?: string;
  judgeName?: string;
  courtNumber?: string;
  applicableSections?: string[];
  caseDescription?: string;
  priority?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  opposingCounsel?: string;
  hearingCount?: number;
  taskCount?: number;
  noteCount?: number;
  // New intake fields
  incidentDate?: string;
  firDate?: string;
  arrestDate?: string;
  inCustody?: boolean;
  custodyStartDate?: string;
  chargeSheetDate?: string;
  hearingPurpose?: string;
  courtLevel?: CourtLevel;
  lawyerSide?: LawyerSide;
  checklist41aNotice?: ChecklistValue;
  checklistGroundsOfArrest?: ChecklistValue;
  checklistMagistrate24hrs?: ChecklistValue;
  checklistRemandCaseDiary?: ChecklistValue;
  checklistIndependentWitness?: ChecklistValue;
  // Calculated fields
  firDelayDays?: number;
  custodyDays?: number;
  chargeSheetDeadlineDays?: number;
  daysToNextHearing?: number;
  recommendations?: Recommendation[];
  dismissedRecommendations?: string[];
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
    filingDate?: string;
    filingNumber?: string;
    firNumber?: string;
    policeStation?: string;
    judgeName?: string;
    courtNumber?: string;
    applicableSections?: string[];
    caseDescription?: string;
    priority?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    opposingCounsel?: string;
    courtLevel?: CourtLevel;
    lawyerSide?: LawyerSide;
    incidentDate?: string;
    firDate?: string;
    arrestDate?: string;
    inCustody?: boolean;
    custodyStartDate?: string;
    chargeSheetDate?: string;
    hearingPurpose?: string;
    checklist41aNotice?: ChecklistValue;
    checklistGroundsOfArrest?: ChecklistValue;
    checklistMagistrate24hrs?: ChecklistValue;
    checklistRemandCaseDiary?: ChecklistValue;
    checklistIndependentWitness?: ChecklistValue;
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
  hasText?: boolean;
  chunkCount?: number;
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
  source?: "intake" | "document";
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
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
  status: "completed" | "current" | "upcoming";
  autoGenerated: boolean;
  linkedDocumentId?: string;
  linkedHearingId?: string;
  createdAt: string;
}

// ─── Hearings ────────────────────────────────────────────────

export interface Hearing {
  id: string;
  caseId: string;
  hearingDate: string;
  hearingType: string;
  judgeName: string;
  courtNumber: string;
  outcome: string;
  nextDate?: string;
  notes: string;
  adjourned: boolean;
  adjournmentReason: string;
  orderText: string;
  orderDocumentId?: string;
  createdAt: string;
}

// ─── Tasks ───────────────────────────────────────────────────

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "done" | "blocked";
  assignee: string;
  taskType: string;
  completedAt?: string;
  createdAt: string;
}

// ─── Notes ───────────────────────────────────────────────────

export interface CaseNote {
  id: string;
  caseId: string;
  title: string;
  content: string;
  noteType: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ───────────────────────────────────────────

export interface Notification {
  id: string;
  caseId?: string;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
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

// ─── Evidence ────────────────────────────────────────────────

export interface Evidence {
  id: string;
  title: string;
  description?: string;
  evidenceType: string;
  exhibitNumber?: string;
  batesStart?: string;
  batesEnd?: string;
  source?: string;
  custodian?: string;
  dateCollected?: string;
  dateReceived?: string;
  chainOfCustody?: string;
  location?: string;
  isPrivileged: boolean;
  privilegeType?: string;
  admissibilityStatus: string;
  objectionDetails?: string;
  linkedDocumentId?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Deadlines ───────────────────────────────────────────────

export interface Deadline {
  id: string;
  title: string;
  description?: string;
  deadlineType: string;
  dueDate: string;
  reminderDate?: string;
  priority: string;
  status: string;
  courtRule?: string;
  jurisdiction?: string;
  extensionDate?: string;
  extensionReason?: string;
  completedAt?: string;
  assignee?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Discovery ───────────────────────────────────────────────

export interface DiscoveryRequest {
  id: string;
  title: string;
  discoveryType: string;
  direction: string;
  servedTo?: string;
  servedDate?: string;
  dueDate?: string;
  responseDate?: string;
  status: string;
  itemsJson?: string;
  responseSummary?: string;
  objections?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Time Tracking & Billing ─────────────────────────────────

export interface TimeEntry {
  id: string;
  caseId: string;
  description: string;
  activityType?: string;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  isBillable: boolean;
  isBilled: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  caseId: string;
  description: string;
  expenseType: string;
  amount: number;
  date: string;
  vendor?: string;
  isBillable: boolean;
  isReimbursed: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Legal Research ──────────────────────────────────────────

export interface LegalResearchItem {
  id: string;
  title: string;
  researchType: string;
  query?: string;
  summary?: string;
  citation?: string;
  courtName?: string;
  decisionDate?: string;
  relevance: string;
  status: string;
  keyPoints?: string;
  isFavorable?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Communications ─────────────────────────────────────────

export interface Communication {
  id: string;
  commType: string;
  direction: string;
  subject?: string;
  contactName?: string;
  contactRole?: string;
  commDate: string;
  summary?: string;
  followUpDate?: string;
  followUpDone: boolean;
  linkedDocumentId?: string;
  isPrivileged: boolean;
  notes?: string;
  createdAt: string;
}

// ─── Judge Profiles ─────────────────────────────────────────

export interface JudgeProfile {
  id: string;
  name: string;
  court?: string;
  bench?: string;
  specialization?: string;
  tenureStart?: string;
  rulingTendencies?: string;
  motionGrantRate?: number;
  avgSentenceSeverity?: string;
  preferredArguments?: string;
  notableRulings?: string;
  temperament?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
