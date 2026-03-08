"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Evidence } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  Edit3,
  Lock,
  FileText,
  Hash,
} from "lucide-react";

interface EvidenceTabProps {
  caseId: string;
}

const TYPE_LABELS: Record<string, string> = {
  physical: "Physical",
  documentary: "Documentary",
  testimonial: "Testimonial",
  digital: "Digital",
  forensic: "Forensic",
};

const STATUS_COLORS: Record<string, string> = {
  collected: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  submitted: "bg-purple-100 text-purple-800",
  admitted: "bg-green-100 text-green-800",
  excluded: "bg-red-100 text-red-800",
};

export function EvidenceTab({ caseId }: EvidenceTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    evidence_type: "documentary",
    exhibit_number: "",
    source: "",
    custodian: "",
    date_collected: "",
    location: "",
    is_privileged: false,
    status: "collected",
    notes: "",
  });

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["evidence", caseId],
    queryFn: () => api.evidence.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.evidence.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.evidence.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.evidence.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidence", caseId] }),
  });

  function resetForm() {
    setForm({ title: "", description: "", evidence_type: "documentary", exhibit_number: "", source: "", custodian: "", date_collected: "", location: "", is_privileged: false, status: "collected", notes: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(item: Evidence) {
    setForm({
      title: item.title,
      description: item.description || "",
      evidence_type: item.evidenceType,
      exhibit_number: item.exhibitNumber || "",
      source: item.source || "",
      custodian: item.custodian || "",
      date_collected: item.dateCollected || "",
      location: item.location || "",
      is_privileged: item.isPrivileged,
      status: item.status,
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
          <Shield className="w-5 h-5" />
          Evidence ({evidence.length})
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Evidence
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Evidence Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.evidence_type} onChange={(e) => setForm({ ...form, evidence_type: e.target.value })}>
                <option value="documentary">Documentary</option>
                <option value="physical">Physical</option>
                <option value="testimonial">Testimonial</option>
                <option value="digital">Digital</option>
                <option value="forensic">Forensic</option>
              </select>
              <Input placeholder="Exhibit Number" value={form.exhibit_number} onChange={(e) => setForm({ ...form, exhibit_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <Input placeholder="Custodian" value={form.custodian} onChange={(e) => setForm({ ...form, custodian: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={form.date_collected} onChange={(e) => setForm({ ...form, date_collected: e.target.value })} />
              <Input placeholder="Storage Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_privileged} onChange={(e) => setForm({ ...form, is_privileged: e.target.checked })} />
                Privileged
              </label>
              <select className="border rounded-md px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="collected">Collected</option>
                <option value="reviewed">Reviewed</option>
                <option value="submitted">Submitted</option>
                <option value="admitted">Admitted</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>
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

      {evidence.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No evidence items yet. Add evidence to track exhibits, chain of custody, and admissibility.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {evidence.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[item.evidenceType] || item.evidenceType}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"}`}>
                        {item.status}
                      </span>
                      {item.isPrivileged && (
                        <Badge variant="destructive" className="text-xs gap-1"><Lock className="w-3 h-3" /> Privileged</Badge>
                      )}
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {item.exhibitNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {item.exhibitNumber}</span>}
                      {item.source && <span>Source: {item.source}</span>}
                      {item.custodian && <span>Custodian: {item.custodian}</span>}
                      {item.dateCollected && <span>Collected: {item.dateCollected}</span>}
                      {item.location && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {item.location}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(item)}><Edit3 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
