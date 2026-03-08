"use client";

import { motion } from "framer-motion";
import {
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  // Mock extracted insights
  const insights = [
    {
      type: "fact",
      text: "FIR filed on 15 October 2024 at PS Saket, New Delhi",
      page: 1,
    },
    {
      type: "evidence",
      text: "Witness identified accused at 8:45 PM — conflicts with FIR timing of 10:30 PM",
      page: 3,
    },
    {
      type: "fact",
      text: "Investigating officer: SI Ramesh Kumar, Badge No. 4521",
      page: 1,
    },
    {
      type: "evidence",
      text: "No independent witness signature found on FIR — potential procedural violation",
      page: 3,
    },
    {
      type: "fact",
      text: "Sections invoked: 302, 120B IPC",
      page: 2,
    },
    {
      type: "evidence",
      text: "Medical report describes injuries as 'consistent with lateral impact on rough surface' — supports fall theory",
      page: 7,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h3 className="font-semibold text-foreground">{document.name}</h3>
            <p className="text-sm text-muted-foreground">
              {document.pages} pages — {document.size}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page 1 of {document.pages}</span>
          <Button variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* PDF Preview */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="h-full bg-card flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="w-16 h-16 mb-4 text-primary/30" />
                <p className="text-lg font-medium text-foreground mb-1">
                  {document.name}
                </p>
                <p className="text-sm">Document preview area</p>
                <p className="text-xs mt-2 max-w-sm text-center">
                  In production, this area displays the actual PDF using a
                  document renderer with text highlighting capabilities.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Panel */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, i) => (
                <div key={i}>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="shrink-0 mt-0.5">
                      {insight.type === "evidence" ? (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-info" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            insight.type === "evidence" ? "warning" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {insight.type === "evidence"
                            ? "Key Evidence"
                            : "Extracted Fact"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Page {insight.page}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{insight.text}</p>
                    </div>
                  </div>
                  {i < insights.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
