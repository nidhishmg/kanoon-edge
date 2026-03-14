"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCaseRoomStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  FileText,
  Brain,
  Gavel,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

const EVENT_ICONS: Record<string, typeof Clock> = {
  case: Clock,
  document: FileText,
  analysis: Brain,
  hearing: Gavel,
};

function EventIcon({ type }: { type: string }) {
  const Icon = EVENT_ICONS[type] || Clock;
  return <Icon className="w-4 h-4" />;
}

interface TimelineTabProps {
  caseId: string;
}

export function TimelineTab({ caseId }: TimelineTabProps) {
  const { setActiveTab } = useCaseRoomStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["timeline", caseId],
    queryFn: () => api.timeline.getByCase(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { event_type: string; title: string; description?: string; event_date?: string }) =>
      api.timeline.create(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", caseId] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setEventDate("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => api.timeline.delete(eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeline", caseId] }),
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
        <h3 className="text-lg font-semibold text-foreground">Case Timeline</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Event
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!title || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    event_type: "manual",
                    title,
                    description: description || undefined,
                    event_date: eventDate || undefined,
                  })
                }
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No timeline events yet.</p>
            <p className="text-xs mt-1">Events are auto-generated as you upload documents, run analysis, and add hearings.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Manual Event
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("documents")}>Open Documents</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-6 border-l-2 border-border space-y-4">
          {events.map((event) => (
            <div key={event.id} className="relative">
              <div className="absolute -left-[25px] w-4 h-4 rounded-full border-2 border-background bg-primary" />
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-primary">
                        <EventIcon type={event.eventType} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px]">{event.eventType}</Badge>
                          {event.eventDate && (
                            <span className="text-xs text-muted-foreground">{event.eventDate}</span>
                          )}
                          {event.autoGenerated && (
                            <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!event.autoGenerated && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={() => deleteMutation.mutate(event.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
