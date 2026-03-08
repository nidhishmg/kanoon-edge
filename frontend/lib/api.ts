import {
  CaseRoom,
  Document,
  AnalysisResult,
  ChatMessage,
  DashboardStats,
  DraftTemplate,
  User,
  Party,
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
      parties?: { name: string; role: string; notes?: string }[];
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
};
