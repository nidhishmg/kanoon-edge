"use client";

import { useMemo, useState } from "react";
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
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { generatedDraft, setGeneratedDraft } = useCaseRoomStore();
  const { analysisResults } = useCaseRoomStore();

  const { data: caseRoom } = useQuery({
    queryKey: ["case-room", caseId],
    queryFn: () => api.caseRooms.getById(caseId),
  });

  const [confirmedFields, setConfirmedFields] = useState<Record<string, string>>({});
  const [selectedGroundIds, setSelectedGroundIds] = useState<string[]>([]);

  const { data: templates } = useQuery({
    queryKey: ["draft-templates"],
    queryFn: api.drafts.getTemplates,
  });

  const templateNeeds = useMemo(() => {
    const isBailTemplate = selectedTemplate === "bail-application" || selectedTemplate === "anticipatory-bail";
    if (!isBailTemplate || !caseRoom) return [] as Array<{ key: string; label: string; value: string; mandatory: boolean }>;
    return [
      { key: "case_title", label: "Case Title", value: caseRoom.title || "", mandatory: true },
      { key: "case_number", label: "Case Number", value: caseRoom.caseNumber || "", mandatory: true },
      { key: "court", label: "Court Name", value: caseRoom.court || "", mandatory: true },
      { key: "client_name", label: "Client Full Name", value: caseRoom.clientName || "", mandatory: true },
      { key: "fathers_name", label: "Client Father's Name", value: "", mandatory: false },
      { key: "client_age", label: "Client Age", value: "", mandatory: false },
      { key: "client_occupation", label: "Client Occupation", value: "", mandatory: false },
      { key: "client_address", label: "Client Address", value: "", mandatory: false },
      { key: "fir_number", label: "FIR Number", value: caseRoom.firNumber || "", mandatory: false },
      { key: "police_station", label: "Police Station", value: caseRoom.policeStation || "", mandatory: false },
      { key: "arrest_date", label: "Date of Arrest", value: caseRoom.arrestDate || "", mandatory: false },
      {
        key: "applicable_sections",
        label: "Sections Applied",
        value: (caseRoom.applicableSections || []).join(", "),
        mandatory: true,
      },
      { key: "custody_status", label: "Current Custody Status", value: caseRoom.inCustody ? "In custody" : "Not in custody", mandatory: true },
      { key: "custody_days", label: "Days in Custody", value: String(caseRoom.custodyDays || ""), mandatory: false },
    ];
  }, [selectedTemplate, caseRoom]);

  const availableGrounds = useMemo(() => {
    return analysisResults.filter((r) => ["loophole", "argument", "contradiction"].includes(r.type));
  }, [analysisResults]);

  const mandatoryMissing = useMemo(() => {
    return templateNeeds
      .filter((row) => row.mandatory)
      .some((row) => !(confirmedFields[row.key] ?? row.value ?? "").toString().trim());
  }, [templateNeeds, confirmedFields]);

  const openConfirm = () => {
    if (!selectedTemplate) return;
    const defaults: Record<string, string> = {};
    for (const item of templateNeeds) defaults[item.key] = item.value || "";
    setConfirmedFields(defaults);
    setSelectedGroundIds(availableGrounds.filter((r) => r.severity === "high").map((r) => r.id));
    setShowConfirm(true);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    const draft = await api.drafts.generate(selectedTemplate, caseId, {
      confirmed_fields: confirmedFields,
      selected_loophole_ids: selectedGroundIds,
    });
    setGeneratedDraft(draft);
    setShowConfirm(false);
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
                onClick={openConfirm}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Continue to Confirm
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {showConfirm && selectedTemplate ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Auto-fill Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {templateNeeds.map((row) => {
                    const value = confirmedFields[row.key] ?? row.value ?? "";
                    const missing = !value.trim();
                    return (
                      <div key={row.key} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{row.label}</p>
                          {!missing ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          ) : row.mandatory ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          )}
                        </div>
                        <Input
                          value={value}
                          onChange={(e) => setConfirmedFields((prev) => ({ ...prev, [row.key]: e.target.value }))}
                          placeholder={row.mandatory ? "Required — must enter before generating" : "Enter manually"}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Grounds</p>
                  {availableGrounds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No analysis findings available yet. Run analysis to add selectable grounds.</p>
                  ) : (
                    availableGrounds.map((r) => {
                      const checked = selectedGroundIds.includes(r.id);
                      return (
                        <label key={r.id} className="flex items-start gap-2 text-sm rounded-md border border-border p-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setSelectedGroundIds((prev) => (on ? [...prev, r.id] : prev.filter((id) => id !== r.id)));
                            }}
                          />
                          <span>
                            <span className="font-medium text-foreground">{r.title}</span>
                            <span className="text-xs text-muted-foreground block">{r.description}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <Button className="w-full" onClick={handleGenerate} disabled={mandatoryMissing || generating}>
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Proceed to Generate
                </Button>
              </CardContent>
            </Card>
          ) : null}
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
