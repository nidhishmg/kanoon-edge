import {
  CaseRoom,
  Document,
  AnalysisResult,
  ChatMessage,
  DashboardStats,
  DraftTemplate,
  User,
  Party,
  TimelineEvent,
  Hearing,
  Task,
  CaseNote,
  Notification,
  Evidence,
  Deadline,
  DiscoveryRequest,
  TimeEntry,
  Expense,
  LegalResearchItem,
  Communication,
  JudgeProfile,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Token management ────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("kanoonedge_token");
}

function setToken(token: string) {
  localStorage.setItem("kanoonedge_token", token);
}

function clearToken() {
  localStorage.removeItem("kanoonedge_token");
}

// ── Fetch helper ────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData (browser sets boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Response transformers ───────────────────────────────────

interface BackendCaseRoom {
  id: string;
  title: string;
  caseNumber: string;
  court: string;
  caseType: string;
  stage: string;
  documentCount: number;
  loopholesDetected: number;
  nextHearing: string;
  strength: number;
  status: string;
  createdAt: string;
  parties: Party[];
  venue: string;
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
}

function toCaseRoom(c: BackendCaseRoom): CaseRoom {
  return {
    id: c.id,
    title: c.title,
    caseNumber: c.caseNumber,
    court: c.court,
    caseType: c.caseType as CaseRoom["caseType"],
    stage: c.stage as CaseRoom["stage"],
    documentCount: c.documentCount,
    loopholesDetected: c.loopholesDetected,
    nextHearing: c.nextHearing,
    strength: c.strength,
    status: c.status as CaseRoom["status"],
    createdAt: c.createdAt,
    parties: c.parties || [],
    venue: c.venue || "",
    filingDate: c.filingDate,
    filingNumber: c.filingNumber,
    firNumber: c.firNumber,
    policeStation: c.policeStation,
    judgeName: c.judgeName,
    courtNumber: c.courtNumber,
    applicableSections: c.applicableSections,
    caseDescription: c.caseDescription,
    priority: c.priority,
    clientName: c.clientName,
    clientPhone: c.clientPhone,
    clientEmail: c.clientEmail,
    opposingCounsel: c.opposingCounsel,
    hearingCount: c.hearingCount,
    taskCount: c.taskCount,
    noteCount: c.noteCount,
  };
}

interface BackendDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: string;
  pages: number;
}

function toDocument(d: BackendDocument): Document {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    size: d.size,
    uploadDate: d.uploadDate,
    status: d.status as Document["status"],
    pages: d.pages,
  };
}

interface BackendAnalysisResult {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  legalBasis: string;
  guidance: string;
  documentRef: string;
  page: number;
}

function toAnalysisResult(r: BackendAnalysisResult): AnalysisResult {
  return {
    id: r.id,
    type: r.type as AnalysisResult["type"],
    severity: r.severity as AnalysisResult["severity"],
    title: r.title,
    description: r.description,
    legalBasis: r.legalBasis,
    guidance: r.guidance,
    documentRef: r.documentRef,
    page: r.page,
  };
}

interface BackendChatMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  citations?: ChatMessage["citations"];
}

function toChatMessage(m: BackendChatMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role as ChatMessage["role"],
    content: m.content,
    timestamp: m.timestamp,
    citations: m.citations,
  };
}

// ── API ─────────────────────────────────────────────────────

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      const data = await apiFetch<{ access_token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      return data.user;
    },
    register: async (name: string, email: string, password: string): Promise<User> => {
      const data = await apiFetch<{ access_token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(data.access_token);
      return data.user;
    },
    getCurrentUser: async (): Promise<User> => {
      return apiFetch<User>("/auth/me");
    },
    logout: () => {
      clearToken();
    },
    isAuthenticated: (): boolean => {
      return !!getToken();
    },
  },

  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      // Derive stats from actual data
      const cases = await api.caseRooms.getAll();
      return {
        caseRooms: cases.length,
        hearingsToday: cases.filter((c) => {
          const today = new Date().toISOString().split("T")[0];
          return c.nextHearing === today;
        }).length,
        aiAnalyses: cases.reduce((sum, c) => sum + c.loopholesDetected, 0),
        draftsGenerated: 0,
      };
    },
  },

  caseRooms: {
    getAll: async (): Promise<CaseRoom[]> => {
      const data = await apiFetch<BackendCaseRoom[]>("/cases/");
      return data.map(toCaseRoom);
    },
    getById: async (id: string): Promise<CaseRoom | undefined> => {
      try {
        const data = await apiFetch<BackendCaseRoom>(`/cases/${id}`);
        return toCaseRoom(data);
      } catch {
        return undefined;
      }
    },
    create: async (caseData: {
      title: string;
      case_number?: string;
      court?: string;
      case_type?: string;
      stage?: string;
      next_hearing?: string;
      venue?: string;
      filing_date?: string;
      filing_number?: string;
      fir_number?: string;
      police_station?: string;
      judge_name?: string;
      court_number?: string;
      applicable_sections?: string[];
      case_description?: string;
      priority?: string;
      client_name?: string;
      client_phone?: string;
      client_email?: string;
      opposing_counsel?: string;
      parties?: { name: string; role: string; notes?: string; party_type?: string; advocate_name?: string; bar_council_number?: string; contact_phone?: string; contact_email?: string; address?: string }[];
    }): Promise<CaseRoom> => {
      const data = await apiFetch<BackendCaseRoom>("/cases/", {
        method: "POST",
        body: JSON.stringify(caseData),
      });
      return toCaseRoom(data);
    },
  },

  documents: {
    getByCaseId: async (caseId: string): Promise<Document[]> => {
      const data = await apiFetch<BackendDocument[]>(`/documents/${caseId}`);
      return data.map(toDocument);
    },
    upload: async (caseId: string, file: File, documentCategory?: string, isMandatory?: boolean): Promise<Document> => {
      const formData = new FormData();
      formData.append("file", file);
      if (documentCategory) formData.append("document_category", documentCategory);
      if (isMandatory) formData.append("is_mandatory", "1");
      const data = await apiFetch<BackendDocument>(`/documents/${caseId}/upload`, {
        method: "POST",
        body: formData,
      });
      return toDocument(data);
    },
    delete: async (documentId: string): Promise<void> => {
      await apiFetch(`/documents/${documentId}`, { method: "DELETE" });
    },
  },

  analysis: {
    getByCaseId: async (caseId: string): Promise<AnalysisResult[]> => {
      const data = await apiFetch<BackendAnalysisResult[]>(`/analysis/${caseId}`);
      return data.map(toAnalysisResult);
    },
    runAnalysis: async (caseId: string): Promise<AnalysisResult[]> => {
      const data = await apiFetch<BackendAnalysisResult[]>(`/analysis/${caseId}/run`, {
        method: "POST",
      });
      return data.map(toAnalysisResult);
    },
  },

  drafts: {
    getTemplates: async (): Promise<DraftTemplate[]> => {
      return apiFetch<DraftTemplate[]>("/drafts/templates");
    },
    generate: async (templateId: string, caseId: string): Promise<string> => {
      const data = await apiFetch<{ content: string }>("/drafts/generate", {
        method: "POST",
        body: JSON.stringify({ template_id: templateId, case_id: caseId }),
      });
      return data.content;
    },
  },

  chat: {
    getMessages: async (caseId: string): Promise<ChatMessage[]> => {
      const data = await apiFetch<BackendChatMessage[]>(`/chat/${caseId}`);
      return data.map(toChatMessage);
    },
    sendMessage: async (caseId: string, message: string): Promise<ChatMessage> => {
      const data = await apiFetch<BackendChatMessage>(`/chat/${caseId}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      return toChatMessage(data);
    },
    getSuggestedQuestions: async (): Promise<string[]> => {
      return apiFetch<string[]>("/chat/suggested-questions");
    },
  },

  timeline: {
    getByCase: async (caseId: string): Promise<TimelineEvent[]> => {
      return apiFetch<TimelineEvent[]>(`/timeline/${caseId}`);
    },
    create: async (caseId: string, data: { event_type: string; title: string; description?: string; event_date?: string; status?: string }): Promise<TimelineEvent> => {
      return apiFetch<TimelineEvent>(`/timeline/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    delete: async (eventId: string): Promise<void> => {
      await apiFetch(`/timeline/${eventId}`, { method: "DELETE" });
    },
  },

  hearings: {
    getByCase: async (caseId: string): Promise<Hearing[]> => {
      return apiFetch<Hearing[]>(`/hearings/${caseId}`);
    },
    create: async (caseId: string, data: { hearing_date: string; hearing_type?: string; judge_name?: string; court_number?: string; outcome?: string; next_date?: string; notes?: string }): Promise<Hearing> => {
      return apiFetch<Hearing>(`/hearings/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (hearingId: string, data: Record<string, unknown>): Promise<Hearing> => {
      return apiFetch<Hearing>(`/hearings/${hearingId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (hearingId: string): Promise<void> => {
      await apiFetch(`/hearings/${hearingId}`, { method: "DELETE" });
    },
  },

  tasks: {
    getByCase: async (caseId: string): Promise<Task[]> => {
      return apiFetch<Task[]>(`/tasks/${caseId}`);
    },
    create: async (caseId: string, data: { title: string; description?: string; due_date?: string; priority?: string; assignee?: string; task_type?: string }): Promise<Task> => {
      return apiFetch<Task>(`/tasks/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (taskId: string, data: Record<string, unknown>): Promise<Task> => {
      return apiFetch<Task>(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (taskId: string): Promise<void> => {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    },
  },

  notes: {
    getByCase: async (caseId: string): Promise<CaseNote[]> => {
      return apiFetch<CaseNote[]>(`/notes/${caseId}`);
    },
    create: async (caseId: string, data: { title?: string; content: string; note_type?: string; is_private?: boolean }): Promise<CaseNote> => {
      return apiFetch<CaseNote>(`/notes/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (noteId: string, data: Record<string, unknown>): Promise<CaseNote> => {
      return apiFetch<CaseNote>(`/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (noteId: string): Promise<void> => {
      await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
    },
  },

  notifications: {
    getAll: async (): Promise<Notification[]> => {
      return apiFetch<Notification[]>("/notifications/");
    },
    getUnreadCount: async (): Promise<number> => {
      const data = await apiFetch<{ count: number }>("/notifications/unread-count");
      return data.count;
    },
    markRead: async (notificationId: string): Promise<void> => {
      await apiFetch(`/notifications/${notificationId}/read`, { method: "PUT" });
    },
    markAllRead: async (): Promise<void> => {
      await apiFetch("/notifications/read-all", { method: "PUT" });
    },
  },

  evidence: {
    getByCase: async (caseId: string): Promise<Evidence[]> => {
      return apiFetch<Evidence[]>(`/evidence/${caseId}`);
    },
    create: async (caseId: string, data: { title: string; evidence_type?: string; description?: string; exhibit_number?: string; source?: string; custodian?: string; date_collected?: string; location?: string; is_privileged?: boolean; privilege_type?: string; status?: string; notes?: string }): Promise<Evidence> => {
      return apiFetch<Evidence>(`/evidence/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (evidenceId: string, data: Record<string, unknown>): Promise<Evidence> => {
      return apiFetch<Evidence>(`/evidence/${evidenceId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (evidenceId: string): Promise<void> => {
      await apiFetch(`/evidence/${evidenceId}`, { method: "DELETE" });
    },
  },

  deadlines: {
    getByCase: async (caseId: string): Promise<Deadline[]> => {
      return apiFetch<Deadline[]>(`/deadlines/${caseId}`);
    },
    create: async (caseId: string, data: { title: string; deadline_type?: string; due_date: string; description?: string; reminder_date?: string; priority?: string; court_rule?: string; jurisdiction?: string; assignee?: string; notes?: string }): Promise<Deadline> => {
      return apiFetch<Deadline>(`/deadlines/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (deadlineId: string, data: Record<string, unknown>): Promise<Deadline> => {
      return apiFetch<Deadline>(`/deadlines/${deadlineId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (deadlineId: string): Promise<void> => {
      await apiFetch(`/deadlines/${deadlineId}`, { method: "DELETE" });
    },
  },

  discovery: {
    getByCase: async (caseId: string): Promise<DiscoveryRequest[]> => {
      return apiFetch<DiscoveryRequest[]>(`/discovery/${caseId}`);
    },
    create: async (caseId: string, data: { title: string; discovery_type?: string; direction?: string; served_to?: string; served_date?: string; due_date?: string; notes?: string }): Promise<DiscoveryRequest> => {
      return apiFetch<DiscoveryRequest>(`/discovery/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (discoveryId: string, data: Record<string, unknown>): Promise<DiscoveryRequest> => {
      return apiFetch<DiscoveryRequest>(`/discovery/${discoveryId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (discoveryId: string): Promise<void> => {
      await apiFetch(`/discovery/${discoveryId}`, { method: "DELETE" });
    },
  },

  billing: {
    getTimeEntries: async (caseId: string): Promise<TimeEntry[]> => {
      return apiFetch<TimeEntry[]>(`/billing/time/${caseId}`);
    },
    createTimeEntry: async (caseId: string, data: { description: string; date: string; hours: number; activity_type?: string; rate?: number; is_billable?: boolean; notes?: string }): Promise<TimeEntry> => {
      return apiFetch<TimeEntry>(`/billing/time/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateTimeEntry: async (entryId: string, data: Record<string, unknown>): Promise<TimeEntry> => {
      return apiFetch<TimeEntry>(`/billing/time/${entryId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteTimeEntry: async (entryId: string): Promise<void> => {
      await apiFetch(`/billing/time/${entryId}`, { method: "DELETE" });
    },
    getExpenses: async (caseId: string): Promise<Expense[]> => {
      return apiFetch<Expense[]>(`/billing/expenses/${caseId}`);
    },
    createExpense: async (caseId: string, data: { description: string; expense_type?: string; amount: number; date: string; vendor?: string; is_billable?: boolean; notes?: string }): Promise<Expense> => {
      return apiFetch<Expense>(`/billing/expenses/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateExpense: async (expenseId: string, data: Record<string, unknown>): Promise<Expense> => {
      return apiFetch<Expense>(`/billing/expenses/${expenseId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteExpense: async (expenseId: string): Promise<void> => {
      await apiFetch(`/billing/expenses/${expenseId}`, { method: "DELETE" });
    },
  },

  research: {
    getByCase: async (caseId: string): Promise<LegalResearchItem[]> => {
      return apiFetch<LegalResearchItem[]>(`/research/${caseId}`);
    },
    create: async (caseId: string, data: { title: string; research_type?: string; query?: string; summary?: string; citation?: string; court_name?: string; decision_date?: string; relevance?: string; key_points?: string; is_favorable?: boolean; notes?: string }): Promise<LegalResearchItem> => {
      return apiFetch<LegalResearchItem>(`/research/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (researchId: string, data: Record<string, unknown>): Promise<LegalResearchItem> => {
      return apiFetch<LegalResearchItem>(`/research/${researchId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (researchId: string): Promise<void> => {
      await apiFetch(`/research/${researchId}`, { method: "DELETE" });
    },
  },

  communications: {
    getByCase: async (caseId: string): Promise<Communication[]> => {
      return apiFetch<Communication[]>(`/communications/${caseId}`);
    },
    create: async (caseId: string, data: { comm_type?: string; direction?: string; subject?: string; contact_name?: string; contact_role?: string; comm_date: string; summary?: string; follow_up_date?: string; is_privileged?: boolean; notes?: string }): Promise<Communication> => {
      return apiFetch<Communication>(`/communications/${caseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (commId: string, data: Record<string, unknown>): Promise<Communication> => {
      return apiFetch<Communication>(`/communications/${commId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (commId: string): Promise<void> => {
      await apiFetch(`/communications/${commId}`, { method: "DELETE" });
    },
  },

  judges: {
    getAll: async (): Promise<JudgeProfile[]> => {
      return apiFetch<JudgeProfile[]>("/judges/");
    },
    create: async (data: { name: string; court?: string; bench?: string; specialization?: string; tenure_start?: string; ruling_tendencies?: string; motion_grant_rate?: number; temperament?: string; notes?: string }): Promise<JudgeProfile> => {
      return apiFetch<JudgeProfile>("/judges/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (judgeId: string, data: Record<string, unknown>): Promise<JudgeProfile> => {
      return apiFetch<JudgeProfile>(`/judges/${judgeId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (judgeId: string): Promise<void> => {
      await apiFetch(`/judges/${judgeId}`, { method: "DELETE" });
    },
  },
};
