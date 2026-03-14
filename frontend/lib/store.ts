import { create } from "zustand";
import { User, Document, AnalysisResult, ChatMessage } from "@/types";

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

interface CaseRoomState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clientTabTargetSection: "profile" | "document-requests" | "messages" | null;
  setClientTabTargetSection: (section: "profile" | "document-requests" | "messages" | null) => void;
  prefilledMessage: string;
  setPrefilledMessage: (msg: string) => void;
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  analysisResults: AnalysisResult[];
  setAnalysisResults: (results: AnalysisResult[]) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  generatedDraft: string;
  setGeneratedDraft: (draft: string) => void;
}

export const useCaseRoomStore = create<CaseRoomState>((set) => ({
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),
  clientTabTargetSection: null,
  setClientTabTargetSection: (section) => set({ clientTabTargetSection: section }),
  prefilledMessage: "",
  setPrefilledMessage: (msg) => set({ prefilledMessage: msg }),
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),
  analysisResults: [],
  setAnalysisResults: (results) => set({ analysisResults: results }),
  chatMessages: [],
  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  generatedDraft: "",
  setGeneratedDraft: (draft) => set({ generatedDraft: draft }),
}));
