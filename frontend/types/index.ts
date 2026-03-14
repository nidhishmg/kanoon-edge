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
  client?: {
    id: string;
    name: string;
    phone: string;
    profileComplete: boolean;
    unreadMessageCount: number;
    activeDocumentRequestCount: number;
  };
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
  uploadedByClient?: boolean;
  documentRequestId?: string;
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
  autoGenerated?: boolean;
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
  documentId?: string;
  isFavorable?: boolean;
  admissibilityNote?: string;
  autoGenerated?: boolean;
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

// ─── Client Management ──────────────────────────────────────

export interface ClientRecord {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  fathers_name?: string;
  occupation?: string;
  employer_name?: string;
  annual_income_range?: string;
  marital_status?: string;
  primary_phone: string;
  alternate_phone?: string;
  email?: string;
  permanent_address?: string;
  current_address?: string;
  aadhaar_last4?: string;
  pan_number?: string;
  passport_number?: string;
  passport_expiry?: string;
  voter_id?: string;
  has_passport?: boolean;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  prior_cases?: boolean;
  prior_convictions?: boolean;
  currently_on_bail?: boolean;
  bail_conditions?: string;
  is_first_offender?: boolean;
  family_dependents_count?: number;
  spouse_name?: string;
  children_names?: string;
  payment_capacity?: string;
  lawyer_notes?: string;
  profile_complete?: boolean;
  client_since?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientListItem {
  id: string;
  full_name: string;
  primary_phone: string;
  email?: string;
  active_case_count: number;
  total_outstanding_fees: number;
  client_since?: string;
}

export interface ClientAccessLink {
  id: string;
  case_id: string;
  client_id?: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  is_revoked: boolean;
  pin_enabled: boolean;
  open_count: number;
  last_opened_at?: string;
  show_hearing_date: boolean;
  show_case_stage: boolean;
  show_case_summary: boolean;
  allow_document_upload: boolean;
  allow_client_messages: boolean;
  require_profile_completion: boolean;
  profile_completed: boolean;
  share_url: string;
}

export interface ClientDocumentRequestItem {
  id: string;
  case_id: string;
  client_id?: string;
  document_name: string;
  reason?: string;
  due_date?: string;
  status: "requested" | "uploaded" | "approved" | "rejected";
  uploaded_document_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCaseMessage {
  id: string;
  case_id: string;
  client_id?: string;
  sender_type: "lawyer" | "client";
  sender_id: string;
  content: string;
  attachment_document_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface PublicClientCaseSummary {
  case_title: string;
  case_stage?: string;
  next_hearing_date?: string;
  next_hearing_purpose?: string;
  days_until_next_hearing?: number;
  case_summary?: string;
  profile_complete: boolean;
  allow_document_upload: boolean;
  allow_client_messages: boolean;
  pin_enabled: boolean;
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
