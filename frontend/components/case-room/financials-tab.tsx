"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TimeEntry, Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  Edit3,
  Clock,
  Receipt,
} from "lucide-react";

interface FinancialsTabProps {
  caseId: string;
}

type TabView = "time" | "expenses";

export function FinancialsTab({ caseId }: FinancialsTabProps) {
  const [view, setView] = useState<TabView>("time");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant={view === "time" ? "default" : "outline"} onClick={() => setView("time")} className="gap-1">
          <Clock className="w-4 h-4" /> Time Entries
        </Button>
        <Button size="sm" variant={view === "expenses" ? "default" : "outline"} onClick={() => setView("expenses")} className="gap-1">
          <Receipt className="w-4 h-4" /> Expenses
        </Button>
      </div>
      {view === "time" ? <TimeSection caseId={caseId} /> : <ExpenseSection caseId={caseId} />}
    </div>
  );
}

// ── Time Entries Section ────────────────────────────────────

function TimeSection({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    activity_type: "research",
    date: new Date().toISOString().split("T")[0],
    hours: 0,
    rate: 0,
    is_billable: true,
    notes: "",
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timeEntries", caseId],
    queryFn: () => api.billing.getTimeEntries(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.billing.createTimeEntry(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.billing.updateTimeEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.billing.deleteTimeEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeEntries", caseId] }),
  });

  function resetForm() {
    setForm({ description: "", activity_type: "research", date: new Date().toISOString().split("T")[0], hours: 0, rate: 0, is_billable: true, notes: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(item: TimeEntry) {
    setForm({
      description: item.description,
      activity_type: item.activityType || "research",
      date: item.date,
      hours: item.hours,
      rate: item.rate,
      is_billable: item.isBillable,
      notes: item.notes || "",
    });
    setEditId(item.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.description.trim() || form.hours <= 0) return;
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
  const billableHours = entries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time Entries ({entries.length})
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Log Time
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="py-3 text-center"><div className="text-2xl font-bold">{totalHours.toFixed(1)}</div><div className="text-xs text-muted-foreground">Total Hours</div></CardContent></Card>
        <Card><CardContent className="py-3 text-center"><div className="text-2xl font-bold">{billableHours.toFixed(1)}</div><div className="text-xs text-muted-foreground">Billable Hours</div></CardContent></Card>
        <Card><CardContent className="py-3 text-center"><div className="text-2xl font-bold">&#8377;{totalAmount.toFixed(0)}</div><div className="text-xs text-muted-foreground">Total Amount</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-4 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
                <option value="research">Research</option>
                <option value="drafting">Drafting</option>
                <option value="court_appearance">Court Appearance</option>
                <option value="meeting">Meeting</option>
                <option value="travel">Travel</option>
                <option value="review">Review</option>
              </select>
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hours *</label>
                <Input type="number" step="0.25" min="0" value={form.hours || ""} onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rate (&#8377;/hr)</label>
                <Input type="number" min="0" value={form.rate || ""} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_billable} onChange={(e) => setForm({ ...form, is_billable: e.target.checked })} />
                Billable
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editId ? "Update" : "Log"}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No time entries yet. Log your billable hours for this case.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.description}</span>
                      {item.activityType && <Badge variant="outline" className="text-xs">{item.activityType}</Badge>}
                      {!item.isBillable && <Badge variant="secondary" className="text-xs">Non-billable</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{item.date}</span>
                      <span className="font-medium">{item.hours}h</span>
                      {item.rate > 0 && <span>@ &#8377;{item.rate}/hr</span>}
                      {item.amount > 0 && <span className="font-medium text-foreground">&#8377;{item.amount.toFixed(0)}</span>}
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

// ── Expenses Section ────────────────────────────────────────

function ExpenseSection({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    expense_type: "filing_fee",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    is_billable: true,
    notes: "",
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", caseId],
    queryFn: () => api.billing.getExpenses(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.billing.createExpense(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.billing.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.billing.deleteExpense(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", caseId] }),
  });

  function resetForm() {
    setForm({ description: "", expense_type: "filing_fee", amount: 0, date: new Date().toISOString().split("T")[0], vendor: "", is_billable: true, notes: "" });
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(item: Expense) {
    setForm({
      description: item.description,
      expense_type: item.expenseType,
      amount: item.amount,
      date: item.date,
      vendor: item.vendor || "",
      is_billable: item.isBillable,
      notes: item.notes || "",
    });
    setEditId(item.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.description.trim() || form.amount <= 0) return;
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Expenses ({expenses.length}) — Total: &#8377;{totalExpenses.toFixed(0)}
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value })}>
                <option value="filing_fee">Filing Fee</option>
                <option value="courier">Courier</option>
                <option value="travel">Travel</option>
                <option value="printing">Printing</option>
                <option value="expert_fee">Expert Fee</option>
                <option value="other">Other</option>
              </select>
              <div>
                <label className="text-xs text-muted-foreground">Amount (&#8377;) *</label>
                <Input type="number" min="0" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <Input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_billable} onChange={(e) => setForm({ ...form, is_billable: e.target.checked })} />
                Billable to Client
              </label>
            </div>
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

      {expenses.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No expenses recorded. Track filing fees, courier costs, travel, and other case expenses.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.description}</span>
                      <Badge variant="outline" className="text-xs">{item.expenseType}</Badge>
                      <span className="font-medium text-foreground">&#8377;{item.amount.toFixed(0)}</span>
                      {!item.isBillable && <Badge variant="secondary" className="text-xs">Non-billable</Badge>}
                      {item.isReimbursed && <Badge variant="default" className="text-xs bg-green-600">Reimbursed</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{item.date}</span>
                      {item.vendor && <span>Vendor: {item.vendor}</span>}
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
