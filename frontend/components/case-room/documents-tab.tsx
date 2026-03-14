"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Document } from "@/types";
import { useCaseRoomStore } from "@/lib/store";
import { DocumentViewer } from "@/components/case-room/document-viewer";

interface DocumentsTabProps {
  caseId: string;
  caseType?: string;
}

type Recommendation = {
  name: string;
  priority: "Critical" | "High" | "Medium";
  why: string;
};

const recommendationRules: Record<string, Recommendation[]> = {
  criminal: [
    { name: "FIR", priority: "Critical", why: "Foundation record for allegations and timeline consistency checks." },
    { name: "Arrest Memo", priority: "Critical", why: "Required to validate arrest procedure and custody claims." },
    { name: "Charge Sheet", priority: "High", why: "Core prosecution theory and evidence list for contradictions." },
    { name: "Section 41A Notice / Absence Proof", priority: "Critical", why: "Key for default-bail and procedural non-compliance arguments." },
    { name: "Remand Application", priority: "High", why: "Helps test prosecution grounds for custody extension." },
    { name: "Medical Examination Report", priority: "Medium", why: "Can corroborate or undermine allegation timelines." },
    { name: "Witness Statements", priority: "Medium", why: "Useful for contradiction mapping and cross-examination prep." },
    { name: "Previous Bail Order", priority: "High", why: "Mandatory context for re-application strategy and changed circumstances." },
    { name: "Surety Details", priority: "Medium", why: "Speeds filing and reduces hearing-stage delays." },
  ],
  civil: [
    { name: "Plaint / Written Statement", priority: "Critical", why: "Primary pleadings define disputes and admissible issues." },
    { name: "List of Documents", priority: "High", why: "Establishes documentary basis for each pleaded fact." },
    { name: "Previous Orders", priority: "High", why: "Tracks procedural history and interim directions." },
    { name: "Affidavit", priority: "Medium", why: "Supports factual assertions and interim applications." },
    { name: "Agreement / Contract in Dispute", priority: "Critical", why: "Central instrument for interpretation and breach arguments." },
    { name: "Title Documents", priority: "High", why: "Essential for civil/property ownership and possession claims." },
  ],
  family: [
    { name: "Marriage Certificate", priority: "Critical", why: "Core document for maintainability and relationship status." },
    { name: "Birth Certificates of Children", priority: "High", why: "Required for custody, maintenance, and welfare submissions." },
    { name: "Bank Statements (6 months)", priority: "Medium", why: "Supports maintenance claims and financial capacity analysis." },
    { name: "Property Documents", priority: "Medium", why: "Relevant for residence rights and distribution disputes." },
    { name: "Income Proof", priority: "Medium", why: "Helps establish earning capacity and relief quantification." },
  ],
  writ: [
    { name: "Impugned Order / Notification", priority: "Critical", why: "Subject matter document for challenge scope and grounds." },
    { name: "Representation to Authority", priority: "High", why: "Shows prior approach and procedural fairness timeline." },
    { name: "Authority Reply", priority: "Medium", why: "Identifies reasons to be challenged in writ pleadings." },
  ],
};

function getPriorityVariant(priority: Recommendation["priority"]): "destructive" | "warning" | "secondary" {
  if (priority === "Critical") return "destructive";
  if (priority === "High") return "warning";
  return "secondary";
}

const statusIcons: Record<Document["status"], React.ComponentType<{ className?: string }>> = {
  analyzed: CheckCircle,
  uploaded: Clock,
  processing: Loader2,
  error: AlertCircle,
};

export function DocumentsTab({ caseId, caseType }: DocumentsTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [filter, setFilter] = useState("");
  const [showRecommendations, setShowRecommendations] = useState(true);
  const { documents, setDocuments, addDocument } = useCaseRoomStore();
  const recommendationInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: caseRoom } = useQuery({
    queryKey: ["case-room", caseId],
    queryFn: () => api.caseRooms.getById(caseId),
  });

  useQuery({
    queryKey: ["documents", caseId],
    queryFn: async () => {
      const data = await api.documents.getByCaseId(caseId);
      setDocuments(data);
      return data;
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        const doc = await api.documents.upload(caseId, file);
        addDocument(doc);
      }
    },
    [addDocument, caseId]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const doc = await api.documents.upload(caseId, file);
        addDocument(doc);
      }
    },
    [addDocument, caseId]
  );

  const filtered = filter
    ? documents.filter(
        (d) =>
          d.name.toLowerCase().includes(filter.toLowerCase()) ||
          d.type.toLowerCase().includes(filter.toLowerCase())
      )
    : documents;

  const recommendedChecklist = useMemo(() => {
    const source = (caseType || caseRoom?.caseType || "").toLowerCase();
    if (source.includes("bail") || source.includes("criminal")) return recommendationRules.criminal;
    if (source.includes("civil")) return recommendationRules.civil;
    if (source.includes("family")) return recommendationRules.family;
    if (source.includes("writ")) return recommendationRules.writ;
    return recommendationRules.criminal;
  }, [caseRoom?.caseType, caseType]);

  const checklistStatus = useMemo(
    () =>
      recommendedChecklist.map((item) => {
        const key = item.name.toLowerCase();
        const isUploaded = documents.some(
          (doc) => doc.name.toLowerCase().includes(key) || doc.type.toLowerCase().includes(key)
        );
        return { ...item, isUploaded };
      }),
    [recommendedChecklist, documents]
  );

  const hasFiveOrMoreDocs = documents.length >= 5;

  if (viewingDoc) {
    return <DocumentViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">Drag and drop your documents here</p>
          <p className="text-sm text-muted-foreground mb-4">PDF, DOCX, JPG, PNG — up to 50 MB per file</p>
          <label>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <Button variant="outline" size="sm" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </motion.div>

      {/* Document list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Recommended Checklist
            </CardTitle>
            {hasFiveOrMoreDocs ? (
              <Button variant="ghost" size="sm" onClick={() => setShowRecommendations((v) => !v)}>
                {showRecommendations ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide Recommendations
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    View Recommendations
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {(!hasFiveOrMoreDocs || showRecommendations) ? (
          <CardContent className="space-y-3">
            {checklistStatus.map((item) => (
              <div key={item.name} className="rounded-md border border-border px-3 py-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground font-medium">{item.name}</p>
                      <Badge variant={getPriorityVariant(item.priority)}>{item.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.why}</p>
                  </div>
                  {item.isUploaded ? (
                    <Badge variant="success">Uploaded</Badge>
                  ) : (
                    <>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        ref={(el) => {
                          recommendationInputs.current[item.name] = el;
                        }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const doc = await api.documents.upload(caseId, file, item.name, true);
                          addDocument(doc);
                          e.currentTarget.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => recommendationInputs.current[item.name]?.click()}
                      >
                        Upload
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              Uploaded Documents
              <Badge variant="secondary" className="text-xs">{documents.length} files</Badge>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-border mx-auto mb-3" />
              <p className="text-foreground font-medium">
                {filter ? "No documents match your search" : "No documents uploaded yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter ? "Try a different search term" : "Upload documents to unlock timeline and evidence insights."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((doc, i) => {
                  const StatusIcon = statusIcons[doc.status];
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/20 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{doc.type}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{doc.size}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{doc.pages} pages</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{formatDate(doc.uploadDate)}</span>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(doc.status)} shrink-0`}>
                        <StatusIcon
                          className={`w-3 h-3 mr-1 ${doc.status === "processing" ? "animate-spin" : ""}`}
                        />
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setViewingDoc(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-danger hover:text-danger">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
