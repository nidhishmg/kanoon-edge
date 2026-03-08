"use client";

import { useState, useCallback } from "react";
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
}

const statusIcons: Record<Document["status"], React.ComponentType<{ className?: string }>> = {
  analyzed: CheckCircle,
  uploaded: Clock,
  processing: Loader2,
  error: AlertCircle,
};

export function DocumentsTab({ caseId }: DocumentsTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [filter, setFilter] = useState("");
  const { documents, setDocuments, addDocument } = useCaseRoomStore();

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
    [addDocument]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const doc = await api.documents.upload(caseId, file);
        addDocument(doc);
      }
    },
    [addDocument]
  );

  const filtered = filter
    ? documents.filter(
        (d) =>
          d.name.toLowerCase().includes(filter.toLowerCase()) ||
          d.type.toLowerCase().includes(filter.toLowerCase())
      )
    : documents;

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
                {filter ? "Try a different search term" : "Upload documents using the area above"}
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
