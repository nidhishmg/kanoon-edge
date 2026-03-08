"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LegalResearchItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Scale,
  FileText,
} from "lucide-react";

interface ResearchTabProps {
  caseId: string;
}

const TYPE_LABELS: Record<string, string> = {
  case_law: "Case Law",
  statute: "Statute",
  regulation: "Regulation",
  commentary: "Commentary",
  article: "Article",
};

const RELEVANCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-700",
};

export function ResearchTab({ caseId }: ResearchTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    research_type: "case_law",
    query: "",
    summary: "",
    citation: "",
    court_name: "",
    decision_date: "",
    relevance: "medium",
    is_favorable: undefined as boolean | undefined,
    notes: "",
  });

  const { data: research = [], isLoading } = useQuery({
    queryKey: ["research", caseId],
    queryFn: () => api.research.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.research.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.research.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.research.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["research", caseId] }),
  });

  function resetForm() {
    setForm({ title: "", research_type: "case_law", query: "", summary: "", citation: "", court_name: "", decision_date: "", relevance: "medium", is_favorable: undefined, notes: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(item: LegalResearchItem) {
    setForm({
      title: item.title,
      research_type: item.researchType,
      query: item.query || "",
      summary: item.summary || "",
      citation: item.citation || "",
      court_name: item.courtName || "",
      decision_date: item.decisionDate || "",
      relevance: item.relevance,
      is_favorable: item.isFavorable ?? undefined,
      notes: item.notes || "",
    });
    setEditId(item.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.title.trim()) return;
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Legal Research ({research.length})
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Research
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Title / Case Name *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.research_type} onChange={(e) => setForm({ ...form, research_type: e.target.value })}>
                <option value="case_law">Case Law</option>
                <option value="statute">Statute</option>
                <option value="regulation">Regulation</option>
                <option value="commentary">Commentary</option>
                <option value="article">Article</option>
              </select>
              <select className="border rounded-md px-3 py-2 text-sm" value={form.relevance} onChange={(e) => setForm({ ...form, relevance: e.target.value })}>
                <option value="high">High Relevance</option>
                <option value="medium">Medium Relevance</option>
                <option value="low">Low Relevance</option>
              </select>
              <select className="border rounded-md px-3 py-2 text-sm" value={form.is_favorable === undefined ? "" : form.is_favorable ? "true" : "false"} onChange={(e) => setForm({ ...form, is_favorable: e.target.value === "" ? undefined : e.target.value === "true" })}>
                <option value="">Favorability Unknown</option>
                <option value="true">Favorable</option>
                <option value="false">Unfavorable</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Citation (e.g., AIR 2023 SC 456)" value={form.citation} onChange={(e) => setForm({ ...form, citation: e.target.value })} />
              <Input placeholder="Court Name" value={form.court_name} onChange={(e) => setForm({ ...form, court_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Decision Date</label>
                <Input type="date" value={form.decision_date} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} />
              </div>
              <Input placeholder="Search Query" value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} />
            </div>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]" placeholder="Summary / Key Holdings" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[40px]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editId ? "Update" : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {research.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No research entries yet. Track case laws, statutes, regulations, and legal commentary relevant to your case.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {research.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[item.researchType] || item.researchType}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RELEVANCE_COLORS[item.relevance]}`}>
                        {item.relevance}
                      </span>
                      {item.isFavorable === true && <ThumbsUp className="w-4 h-4 text-green-500" />}
                      {item.isFavorable === false && <ThumbsDown className="w-4 h-4 text-red-500" />}
                    </div>
                    {item.citation && (
                      <p className="text-sm font-mono text-muted-foreground flex items-center gap-1">
                        <Scale className="w-3 h-3" /> {item.citation}
                      </p>
                    )}
                    {item.summary && <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {item.courtName && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {item.courtName}</span>}
                      {item.decisionDate && <span>Decided: {item.decisionDate}</span>}
                      <span>Status: {item.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(item)}><Edit3 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
