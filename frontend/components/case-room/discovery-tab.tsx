"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DiscoveryRequest } from "@/types";
import { useCaseRoomStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  Edit3,
} from "lucide-react";

interface DiscoveryTabProps {
  caseId: string;
}

const TYPE_LABELS: Record<string, string> = {
  interrogatory: "Interrogatories",
  rfp: "Request for Production",
  rfa: "Request for Admission",
  deposition: "Deposition",
  subpoena: "Subpoena",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  served: "bg-blue-100 text-blue-700",
  responded: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  objected: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export function DiscoveryTab({ caseId }: DiscoveryTabProps) {
  const { setActiveTab } = useCaseRoomStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    discovery_type: "interrogatory",
    due_date: "",
    notes: "",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["discovery", caseId],
    queryFn: () => api.discovery.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.discovery.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.discovery.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.discovery.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discovery", caseId] }),
  });

  function resetForm() {
    setForm({ title: "", discovery_type: "interrogatory", due_date: "", notes: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(item: DiscoveryRequest) {
    setForm({
      title: item.title,
      discovery_type: item.discoveryType,
      due_date: item.dueDate || "",
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
          <Search className="w-5 h-5" />
          Discovery ({requests.length})
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Request Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.discovery_type} onChange={(e) => setForm({ ...form, discovery_type: e.target.value })}>
                <option value="interrogatory">Interrogatories</option>
                <option value="rfp">Request for Production</option>
                <option value="rfa">Request for Admission</option>
                <option value="deposition">Deposition</option>
                <option value="subpoena">Subpoena</option>
              </select>
              <div>
                <label className="text-xs text-muted-foreground">Due Date</label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editId ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-3">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No discovery requests yet.</p>
            <p className="text-xs">Start with one outgoing interrogatory or collect incoming requests from opposite counsel.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("documents")}>
                Open Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[item.discoveryType] || item.discoveryType}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-700"}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {item.dueDate && <span>Due: {item.dueDate}</span>}
                      {item.responseDate && <span>Responded: {item.responseDate}</span>}
                    </div>
                    {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
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
