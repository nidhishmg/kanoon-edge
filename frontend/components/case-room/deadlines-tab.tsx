"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Deadline } from "@/types";
import { useCaseRoomStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  Edit3,
  CheckCircle,
  Clock,
  CalendarClock,
  RefreshCw,
} from "lucide-react";

interface DeadlinesTabProps {
  caseId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  pending: Clock,
  missed: AlertTriangle,
  extended: CalendarClock,
};

export function DeadlinesTab({ caseId }: DeadlinesTabProps) {
  const { setActiveTab } = useCaseRoomStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline_type: "filing",
    due_date: "",
    reminder_date: "",
    priority: "medium",
    court_rule: "",
    jurisdiction: "",
    assignee: "",
    notes: "",
  });

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ["deadlines", caseId],
    queryFn: () => api.deadlines.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.deadlines.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.deadlines.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deadlines.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deadlines", caseId] }),
  });

  const recalculateMutation = useMutation({
    mutationFn: () => api.deadlines.recalculate(caseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deadlines", caseId] }),
  });

  function resetForm() {
    setForm({ title: "", description: "", deadline_type: "filing", due_date: "", reminder_date: "", priority: "medium", court_rule: "", jurisdiction: "", assignee: "", notes: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(item: Deadline) {
    setForm({
      title: item.title,
      description: item.description || "",
      deadline_type: item.deadlineType,
      due_date: item.dueDate,
      reminder_date: item.reminderDate || "",
      priority: item.priority,
      court_rule: item.courtRule || "",
      jurisdiction: item.jurisdiction || "",
      assignee: item.assignee || "",
      notes: item.notes || "",
    });
    setEditId(item.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.due_date) return;
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function toggleComplete(item: Deadline) {
    const newStatus = item.status === "completed" ? "pending" : "completed";
    updateMutation.mutate({ id: item.id, data: { status: newStatus } });
  }

  function isOverdue(item: Deadline) {
    if (item.status === "completed") return false;
    return new Date(item.dueDate) < new Date();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = deadlines.filter(d => d.status !== "completed");
  const completed = deadlines.filter(d => d.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          Deadlines ({deadlines.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => recalculateMutation.mutate()} disabled={recalculateMutation.isPending}>
            {recalculateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Recalculate
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Deadline
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Deadline Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.deadline_type} onChange={(e) => setForm({ ...form, deadline_type: e.target.value })}>
                <option value="filing">Filing</option>
                <option value="response">Response</option>
                <option value="discovery">Discovery</option>
                <option value="motion">Motion</option>
                <option value="appeal">Appeal</option>
                <option value="statutory">Statutory</option>
              </select>
              <select className="border rounded-md px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Due Date *</label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reminder Date</label>
                <Input type="date" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Court Rule" value={form.court_rule} onChange={(e) => setForm({ ...form, court_rule: e.target.value })} />
              <Input placeholder="Assignee" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
            </div>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

      {deadlines.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-3">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No deadlines set yet.</p>
            <p className="text-xs">Add your first filing date, or import hearing-driven dates from timeline events.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Deadline
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("timeline")}>Open Timeline</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Active ({pending.length})</h4>
              {pending.map((item) => {
                const overdue = isOverdue(item);
                const StatusIcon = STATUS_ICONS[item.status] || Clock;
                return (
                  <Card key={item.id} className={overdue ? "border-red-300 bg-red-50/50" : ""}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <button onClick={() => toggleComplete(item)} className="mt-0.5">
                            <StatusIcon className={`w-5 h-5 ${overdue ? "text-red-500" : "text-muted-foreground"}`} />
                          </button>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{item.title}</span>
                              <Badge variant="outline" className="text-xs">{item.deadlineType}</Badge>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority]}`}>
                                {item.priority}
                              </span>
                              {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                            </div>
                            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>Due: {item.dueDate}</span>
                              {item.courtRule && <span>Rule: {item.courtRule}</span>}
                              {item.assignee && <span>Assignee: {item.assignee}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(item)}><Edit3 className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Completed ({completed.length})</h4>
              {completed.map((item) => (
                <Card key={item.id} className="opacity-60">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleComplete(item)}>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </button>
                        <span className="line-through text-muted-foreground">{item.title}</span>
                        <Badge variant="outline" className="text-xs">{item.deadlineType}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
