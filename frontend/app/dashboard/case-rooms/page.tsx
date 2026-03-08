"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDate, getStrengthColor } from "@/lib/utils";
import { CreateWizard } from "@/components/case-room/create-wizard";

export default function CaseRoomsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: caseRooms, isLoading } = useQuery({
    queryKey: ["case-rooms"],
    queryFn: api.caseRooms.getAll,
  });

  return (
    <div className="max-w-container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Case Rooms</h1>
          <p className="text-muted-foreground">
            Manage and access all your legal cases
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Case Room
        </Button>
      </div>

      {wizardOpen && <CreateWizard onClose={() => setWizardOpen(false)} />}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search case rooms..." className="pl-9" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px]" />
            ))
          : caseRooms?.map((caseRoom, i) => (
              <motion.div
                key={caseRoom.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/dashboard/case-rooms/${caseRoom.id}`}>
                  <Card className="hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {caseRoom.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {caseRoom.caseNumber} — {caseRoom.court}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary">{caseRoom.caseType}</Badge>
                        <Badge variant="outline">{caseRoom.stage}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <p className="text-lg font-bold text-foreground">{caseRoom.documentCount}</p>
                          <p className="text-xs text-muted-foreground">Docs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-warning">{caseRoom.loopholesDetected}</p>
                          <p className="text-xs text-muted-foreground">Loopholes</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${getStrengthColor(caseRoom.strength)}`}>{caseRoom.strength}%</p>
                          <p className="text-xs text-muted-foreground">Strength</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatDate(caseRoom.nextHearing)}</p>
                          <p className="text-xs text-muted-foreground">Hearing</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
      </div>
    </div>
  );
}
