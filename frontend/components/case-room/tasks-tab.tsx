"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Task } from "@/types";
import { useCaseRoomStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Plus,
  Trash2,
  Loader2,
  Square,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";

const STATUS_ICONS: Record<string, typeof Square> = {
  todo: Square,
  in_progress: Circle,
  done: CheckCircle2,
  blocked: AlertCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary",
  medium: "default",
  high: "warning",
  urgent: "destructive",
};

interface TasksTabProps {
  caseId: string;
}

export function TasksTab({ caseId }: TasksTabProps) {
  const { setActiveTab } = useCaseRoomStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    assignee: "",
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", caseId],
    queryFn: () => api.tasks.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.tasks.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", caseId] });
      setShowForm(false);
      setForm({ title: "", description: "", due_date: "", priority: "medium", assignee: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.tasks.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", caseId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", caseId] }),
  });

  const cycleStatus = (task: Task) => {
    const order = ["todo", "in_progress", "done"];
    const current = order.indexOf(task.status);
    const next = order[(current + 1) % order.length];
    updateMutation.mutate({ id: task.id, data: { status: next } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Tasks
          <span className="text-muted-foreground text-sm font-normal ml-2">
            {tasks.filter((t) => t.status === "done").length}/{tasks.length} done
          </span>
        </h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Task title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Assignee</label>
                <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Name" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.title || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Create Task
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <CheckSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No tasks yet.</p>
            <p className="text-xs mt-1">Create tasks to track deadlines and action items for this case.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("deadlines")}>Open Deadlines</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { label: "To Do", items: todoTasks },
            { label: "In Progress", items: inProgressTasks },
            { label: "Done", items: doneTasks },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {group.label} ({group.items.length})
                </p>
                <div className="space-y-2">
                  {group.items.map((task) => {
                    const StatusIcon = STATUS_ICONS[task.status] || Square;
                    return (
                      <Card key={task.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => cycleStatus(task)}
                              className={`shrink-0 ${task.status === "done" ? "text-green-500" : "text-muted-foreground hover:text-primary"}`}
                            >
                              <StatusIcon className="w-5 h-5" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={PRIORITY_COLORS[task.priority] as "default" | "secondary" | "warning" | "destructive"} className="text-[10px]">
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                                )}
                                {task.assignee && (
                                  <span className="text-xs text-muted-foreground">@{task.assignee}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 shrink-0"
                              onClick={() => deleteMutation.mutate(task.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
