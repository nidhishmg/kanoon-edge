"use client";

import { MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const upcomingHearings = [
  {
    id: "h1",
    caseTitle: "State vs. Rajesh Kumar",
    caseNumber: "CR/2024/1847",
    court: "Delhi High Court",
    date: "2026-03-15",
    time: "10:30 AM",
    type: "Evidence — Witness Examination",
    room: "Court Room 12",
  },
  {
    id: "h2",
    caseTitle: "Mehta Industries vs. Tax Authority",
    caseNumber: "CW/2025/0392",
    court: "Bombay High Court",
    date: "2026-03-22",
    time: "11:00 AM",
    type: "Arguments",
    room: "Court Room 5",
  },
  {
    id: "h3",
    caseTitle: "Priya Sharma Divorce Petition",
    caseNumber: "FC/2025/0156",
    court: "Family Court, Bangalore",
    date: "2026-04-01",
    time: "2:00 PM",
    type: "Mediation Session",
    room: "Mediation Room 3",
  },
];

export default function HearingsPage() {
  return (
    <div className="max-w-container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Hearings</h1>
        <p className="text-muted-foreground">
          Upcoming court dates and hearing schedule
        </p>
      </div>

      <div className="space-y-4">
        {upcomingHearings.map((hearing) => (
          <Card key={hearing.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-xs text-primary font-medium">
                      {new Date(hearing.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {new Date(hearing.date).getDate()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{hearing.caseTitle}</h3>
                  <p className="text-sm text-muted-foreground">{hearing.caseNumber}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {hearing.court}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {hearing.time}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{hearing.type}</Badge>
                  <Badge variant="outline">{hearing.room}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
