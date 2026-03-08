"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FileEdit,
  Scale,
  Mail,
  UserCheck,
  Loader2,
  Sparkles,
  Copy,
  Download,
  Check,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useCaseRoomStore } from "@/lib/store";

interface DraftTabProps {
  caseId: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  FileEdit,
  Scale,
  Mail,
  UserCheck,
  Gavel: Scale,
};

export function DraftTab({ caseId }: DraftTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { generatedDraft, setGeneratedDraft } = useCaseRoomStore();

  const { data: templates } = useQuery({
    queryKey: ["draft-templates"],
    queryFn: api.drafts.getTemplates,
  });

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    const draft = await api.drafts.generate(selectedTemplate, caseId);
    setGeneratedDraft(draft);
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Draft Generator</h3>
        <p className="text-sm text-muted-foreground">
          Select a document template and generate a legal draft pre-filled with case details
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left — Template selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates?.map((template) => {
                const Icon = iconMap[template.icon] || FileText;
                const isSelected = selectedTemplate === template.id;
                return (
                  <motion.button
                    key={template.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary/10" : "bg-card"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-sm ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {template.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {template.category}
                    </Badge>
                  </motion.button>
                );
              })}

              <Button
                className="w-full mt-4"
                disabled={!selectedTemplate || generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Draft
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right — Draft editor */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Draft Preview</CardTitle>
                {generatedDraft && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${generating ? "animate-spin" : ""}`} />
                      Regenerate
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedDraft ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-secondary/50 rounded-lg p-6 border border-border min-h-[500px]"
                >
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                    {generatedDraft}
                  </pre>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                  <FileText className="w-14 h-14 text-border mb-4" />
                  <p className="text-foreground font-medium mb-1">
                    No draft generated yet
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Select a document type from the left panel and click
                    Generate Draft. The AI will create a complete legal
                    document pre-filled with case information.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
