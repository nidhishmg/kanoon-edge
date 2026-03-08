"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Gavel,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface HearingsTabProps {
  caseId: string;
}

export function HearingsTab({ caseId }: HearingsTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    hearing_date: "",
    hearing_type: "",
    judge_name: "",
    court_number: "",
    outcome: "",
    next_date: "",
    notes: "",
  });

  const { data: hearings = [], isLoading } = useQuery({
    queryKey: ["hearings", caseId],
    queryFn: () => api.hearings.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.hearings.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hearings", caseId] });
      setShowForm(false);
      setForm({ hearing_date: "", hearing_type: "", judge_name: "", court_number: "", outcome: "", next_date: "", notes: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hearings.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hearings", caseId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Hearing History</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Hearing
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Hearing Date *</label>
                <Input type="date" value={form.hearing_date} onChange={(e) => setForm({ ...form, hearing_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Type</label>
                <select
                  value={form.hearing_type}
                  onChange={(e) => setForm({ ...form, hearing_type: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="">Select type</option>
                  <option value="regular">Regular</option>
                  <option value="bail">Bail</option>
                  <option value="arguments">Arguments</option>
                  <option value="evidence">Evidence</option>
                  <option value="judgment">Judgment</option>
                  <option value="motion">Motion</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Judge Name</label>
                <Input value={form.judge_name} onChange={(e) => setForm({ ...form, judge_name: e.target.value })} placeholder="Hon'ble Justice..." />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Court Number</label>
                <Input value={form.court_number} onChange={(e) => setForm({ ...form, court_number: e.target.value })} placeholder="e.g. Court 5" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Outcome</label>
              <Input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="e.g. Adjourned, Bail granted..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Next Date</label>
                <Input type="date" value={form.next_date} onChange={(e) => setForm({ ...form, next_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Hearing notes..."
                className="w-full min-h-[60px] rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.hearing_date || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Save Hearing
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hearings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gavel className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No hearings recorded yet.</p>
            <p className="text-xs mt-1">Add hearing records to maintain a complete case history.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hearings.map((h) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {h.hearingDate} — {h.hearingType || "General Hearing"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {h.judgeName && <Badge variant="secondary" className="text-[10px]">{h.judgeName}</Badge>}
                          {h.outcome && <Badge variant="outline" className="text-[10px]">{h.outcome}</Badge>}
                          {h.adjourned && <Badge variant="destructive" className="text-[10px]">Adjourned</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                    >
                      {expandedId === h.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => deleteMutation.mutate(h.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {expandedId === h.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                    {h.courtNumber && <p><span className="text-muted-foreground">Court:</span> {h.courtNumber}</p>}
                    {h.nextDate && <p><span className="text-muted-foreground">Next Date:</span> {h.nextDate}</p>}
                    {h.notes && <p><span className="text-muted-foreground">Notes:</span> {h.notes}</p>}
                    {h.orderText && <p><span className="text-muted-foreground">Order:</span> {h.orderText}</p>}
                    {h.adjournmentReason && <p><span className="text-muted-foreground">Adjournment Reason:</span> {h.adjournmentReason}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
