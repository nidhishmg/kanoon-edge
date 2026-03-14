"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CaseNote } from "@/types";
import { useCaseRoomStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  Plus,
  Trash2,
  Loader2,
  Edit3,
  Lock,
} from "lucide-react";

interface NotesTabProps {
  caseId: string;
}

export function NotesTab({ caseId }: NotesTabProps) {
  const { setActiveTab } = useCaseRoomStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    note_type: "general",
    is_private: false,
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", caseId],
    queryFn: () => api.notes.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.notes.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", caseId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.notes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", caseId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.notes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", caseId] }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ title: "", content: "", note_type: "general", is_private: false });
  };

  const startEdit = (note: CaseNote) => {
    setEditId(note.id);
    setForm({
      title: note.title,
      content: note.content,
      note_type: note.noteType,
      is_private: note.isPrivate,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

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
        <h3 className="text-lg font-semibold text-foreground">Case Notes</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" />
          Add Note
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Note title (optional)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your note..."
              className="w-full min-h-[120px] rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center gap-4">
              <select
                value={form.note_type}
                onChange={(e) => setForm({ ...form, note_type: e.target.value })}
                className="h-9 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
              >
                <option value="general">General</option>
                <option value="strategy">Strategy</option>
                <option value="research">Research</option>
                <option value="client_communication">Client Communication</option>
                <option value="court_observation">Court Observation</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_private}
                  onChange={(e) => setForm({ ...form, is_private: e.target.checked })}
                  className="rounded"
                />
                Private
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.content || createMutation.isPending || updateMutation.isPending}
                onClick={handleSubmit}
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {editId ? "Update" : "Save"} Note
              </Button>
              <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <StickyNote className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No notes yet.</p>
            <p className="text-xs mt-1">Add notes to document your strategy, observations, and research.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("chat")}>Open Chat</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{note.title || "Untitled Note"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{note.noteType}</Badge>
                      {note.isPrivate && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{note.createdAt?.split("T")[0]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => startEdit(note)}>
                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => deleteMutation.mutate(note.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
