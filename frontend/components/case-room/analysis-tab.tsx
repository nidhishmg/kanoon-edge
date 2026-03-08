"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Brain,
  Loader2,
  CheckCircle,
  BookOpen,
  Scale,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useCaseRoomStore } from "@/lib/store";
import type { AnalysisProgress } from "@/types";

const analysisStages: AnalysisProgress[] = [
  { stage: "reading", label: "Reading documents", complete: false },
  { stage: "extracting", label: "Extracting key legal entities", complete: false },
  { stage: "compliance", label: "Checking procedural compliance", complete: false },
  { stage: "contradictions", label: "Detecting contradictions", complete: false },
  { stage: "precedents", label: "Searching relevant precedents", complete: false },
  { stage: "timeline", label: "Building case timeline", complete: false },
];

interface AnalysisTabProps {
  caseId: string;
}

const typeConfig = {
  loophole: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    label: "Loophole",
  },
  contradiction: {
    icon: ArrowLeftRight,
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/20",
    label: "Contradiction",
  },
  argument: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    label: "Verified Argument",
  },
  gap: {
    icon: Search,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/20",
    label: "Research Gap",
  },
};

const severityConfig = {
  high: { color: "destructive" as const, label: "High Severity" },
  medium: { color: "warning" as const, label: "Medium" },
  low: { color: "secondary" as const, label: "Low" },
};

const stageIcons = {
  reading: BookOpen,
  extracting: FileText,
  compliance: Scale,
  contradictions: ArrowLeftRight,
  precedents: Search,
  timeline: Clock,
};

export function AnalysisTab({ caseId }: AnalysisTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState(analysisStages.map((s) => ({ ...s })));
  const [progress, setProgress] = useState(0);
  const { analysisResults, setAnalysisResults } = useCaseRoomStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useQuery({
    queryKey: ["analysis", caseId],
    queryFn: async () => {
      const data = await api.analysis.getByCaseId(caseId);
      setAnalysisResults(data);
      return data;
    },
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRunAnalysis = async () => {
    setRunning(true);
    setStages(analysisStages.map((s) => ({ ...s, complete: false })));
    setProgress(0);

    // Animate stages sequentially
    let completed = 0;
    intervalRef.current = setInterval(() => {
      completed++;
      setStages((prev) =>
        prev.map((s, i) => (i < completed ? { ...s, complete: true } : s))
      );
      setProgress(Math.round((completed / analysisStages.length) * 100));
      if (completed >= analysisStages.length) {
        clearInterval(intervalRef.current!);
      }
    }, 500);

    const results = await api.analysis.runAnalysis(caseId);
    setAnalysisResults(results);
    setRunning(false);
    setProgress(100);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const counts = {
    loophole: analysisResults.filter((r) => r.type === "loophole").length,
    contradiction: analysisResults.filter((r) => r.type === "contradiction").length,
    argument: analysisResults.filter((r) => r.type === "argument").length,
    gap: analysisResults.filter((r) => r.type === "gap").length,
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">AI Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Identify loopholes, contradictions, and arguments in your case documents
          </p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={running}>
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      {/* Analysis Progress Panel */}
      {running && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-medium text-foreground">Analysis in progress</span>
                <span className="text-xs text-muted-foreground ml-auto">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 mb-5" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stages.map((stage) => {
                  const StageIcon = stageIcons[stage.stage];
                  return (
                    <div
                      key={stage.stage}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all ${
                        stage.complete
                          ? "border-success/20 bg-success/5"
                          : "border-border bg-card/50"
                      }`}
                    >
                      {stage.complete ? (
                        <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <StageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          stage.complete ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(counts) as [keyof typeof typeConfig, number][]).map(([type, count]) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Results */}
      {analysisResults.length === 0 && !running ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="w-14 h-14 text-border mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">No analysis results yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Click &ldquo;Run Analysis&rdquo; to scan your uploaded documents for loopholes,
              contradictions, and legal arguments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {analysisResults.map((result, i) => {
            const config = typeConfig[result.type];
            const severity = severityConfig[result.severity];
            const Icon = config.icon;
            const isExpanded = expandedIds.has(result.id);

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`border transition-colors ${isExpanded ? config.border : "border-border"}`}>
                  <CardContent className="p-0">
                    <button
                      className="w-full px-5 py-4 flex items-center gap-4 text-left"
                      onClick={() => toggleExpanded(result.id)}
                    >
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={severity.color} className="text-[10px]">{severity.label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
                        </div>
                        <h4 className="font-medium text-sm text-foreground truncate">{result.title}</h4>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Description
                              </h5>
                              <p className="text-sm text-foreground leading-relaxed">{result.description}</p>
                            </div>
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Legal Basis
                              </h5>
                              <p className="text-sm text-foreground font-mono bg-secondary/50 p-3 rounded-md border border-border">
                                {result.legalBasis}
                              </p>
                            </div>
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Suggested Strategy
                              </h5>
                              <p className="text-sm text-foreground leading-relaxed">{result.guidance}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                              <FileText className="w-3 h-3" />
                              <span>Source: {result.documentRef} — Page {result.page}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
