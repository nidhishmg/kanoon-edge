"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Users,
  Upload,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  Scale,
  X,
  FolderOpen,
  AlertCircle,
  Circle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CaseType, CaseStage, PartyRole } from "@/types";
import { api } from "@/lib/api";

// ─── Required Document Configuration ────────────────────────

interface RequiredDocConfig {
  category: string;
  label: string;
  description: string;
}

const REQUIRED_DOCS_BY_TYPE: Record<string, RequiredDocConfig[]> = {
  Criminal: [
    { category: "FIR", label: "FIR (First Information Report)", description: "Copy of the registered FIR" },
    { category: "Charge Sheet", label: "Charge Sheet", description: "Police charge sheet / challan" },
    { category: "Witness Statement", label: "Witness Statement", description: "Statements of key witnesses" },
    { category: "Court Order", label: "Court / Bail Order", description: "Any existing court or bail orders" },
  ],
  Civil: [
    { category: "Petition", label: "Petition / Plaint", description: "Original petition or plaint filed" },
    { category: "Written Arguments", label: "Written Arguments", description: "Written statement or arguments" },
    { category: "Court Order", label: "Court Order", description: "Relevant court orders" },
  ],
  "Civil - Tax": [
    { category: "Petition", label: "Petition / Plaint", description: "Original petition or plaint filed" },
    { category: "Written Arguments", label: "Written Arguments", description: "Written statement or arguments" },
    { category: "Court Order", label: "Court Order", description: "Relevant court orders" },
  ],
  "Civil - Property": [
    { category: "Petition", label: "Petition / Plaint", description: "Original petition or plaint filed" },
    { category: "Written Arguments", label: "Written Arguments", description: "Written statement or arguments" },
    { category: "Court Order", label: "Court Order", description: "Relevant court orders" },
  ],
  Corporate: [
    { category: "Contract", label: "Contract / Agreement", description: "Relevant contracts or agreements" },
    { category: "Legal Notice", label: "Legal Notice", description: "Legal notices served or received" },
    { category: "Written Arguments", label: "Written Arguments", description: "Written statement or arguments" },
  ],
  Family: [
    { category: "Petition", label: "Petition", description: "Family court petition" },
    { category: "Court Order", label: "Court Order", description: "Relevant court orders" },
  ],
  Property: [
    { category: "Petition", label: "Petition / Plaint", description: "Original petition or plaint filed" },
    { category: "Court Order", label: "Court Order", description: "Relevant court orders" },
  ],
};

const STAGE_EXTRA_DOCS: Record<string, RequiredDocConfig[]> = {
  "Bail Stage": [
    { category: "Bail Application", label: "Bail Application", description: "Bail application filed" },
  ],
  Trial: [
    { category: "Evidence", label: "Evidence Documents", description: "Documentary evidence for trial" },
  ],
  Appeal: [
    { category: "Previous Judgment", label: "Previous Court Order / Judgment", description: "Judgment or order being appealed" },
  ],
};

// ─── Schemas ─────────────────────────────────────────────────

const caseInfoSchema = z.object({
  title: z.string().min(3, "Case title is required"),
  caseNumber: z.string().min(2, "Case number is required"),
  court: z.string().min(2, "Court name is required"),
  caseType: z.string().min(1, "Select case type"),
  stage: z.string().min(1, "Select case stage"),
  nextHearing: z.string().min(1, "Set next hearing date"),
});

const partySchema = z.object({
  parties: z
    .array(
      z.object({
        name: z.string().min(2, "Name is required"),
        role: z.string().min(1, "Select a role"),
        notes: z.string().optional(),
      })
    )
    .min(1, "Add at least one party"),
});

type CaseInfoForm = z.infer<typeof caseInfoSchema>;
type PartiesForm = z.infer<typeof partySchema>;

const CASE_TYPES: CaseType[] = ["Criminal", "Civil", "Civil - Tax", "Civil - Property", "Corporate", "Family", "Property", "Other"];
const CASE_STAGES: CaseStage[] = ["Investigation", "Bail Stage", "Evidence", "Arguments", "Trial", "Mediation", "Discovery", "Appeal", "Judgment Pending"];
const PARTY_ROLES: PartyRole[] = ["Accused", "Petitioner", "Respondent", "Complainant", "Witness", "Lawyer"];

// ─── Progress Tracker ────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Case Info", icon: FileText },
  { id: 1, label: "Parties", icon: Users },
  { id: 2, label: "Documents", icon: Upload },
  { id: 3, label: "Review", icon: CheckCircle2 },
] as const;

function StepTracker({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === current;
        const isComplete = i < current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary/10 border-2 border-primary text-primary"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-[2px] mx-2 mb-5 transition-colors duration-300 ${
                  isComplete ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────

interface CreateWizardProps {
  onClose: () => void;
}

export function CreateWizard({ onClose }: CreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Case Info
  const caseForm = useForm<CaseInfoForm>({
    resolver: zodResolver(caseInfoSchema),
    defaultValues: { title: "", caseNumber: "", court: "", caseType: "", stage: "", nextHearing: "" },
  });

  // Step 2 — Parties
  const partiesForm = useForm<PartiesForm>({
    resolver: zodResolver(partySchema),
    defaultValues: { parties: [{ name: "", role: "", notes: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: partiesForm.control, name: "parties" });

  const caseValues = caseForm.watch();
  const partiesValues = partiesForm.watch("parties");

  // Step 3 — Documents
  const [requiredFiles, setRequiredFiles] = useState<Record<string, File | null>>({});
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Compute required docs from case type + stage
  const requiredDocs = useMemo(() => {
    const caseType = caseValues.caseType;
    const stage = caseValues.stage;
    const byType = REQUIRED_DOCS_BY_TYPE[caseType] || [];
    const byStage = STAGE_EXTRA_DOCS[stage] || [];
    // Merge, avoiding duplicate categories
    const merged = [...byType];
    for (const doc of byStage) {
      if (!merged.some((d) => d.category === doc.category)) {
        merged.push(doc);
      }
    }
    return merged;
  }, [caseValues.caseType, caseValues.stage]);

  const allRequiredUploaded = useMemo(() => {
    if (requiredDocs.length === 0) return true;
    return requiredDocs.every((doc) => requiredFiles[doc.category] != null);
  }, [requiredDocs, requiredFiles]);

  const handleRequiredFileChange = useCallback((category: string, file: File | null) => {
    setRequiredFiles((prev) => ({ ...prev, [category]: file }));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    setAdditionalFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setAdditionalFiles((prev) => [...prev, ...selected]);
  }, []);

  const removeAdditionalFile = (idx: number) => setAdditionalFiles((prev) => prev.filter((_, i) => i !== idx));

  // Navigation
  const goNext = async () => {
    if (step === 0) {
      const valid = await caseForm.trigger();
      if (!valid) return;
    } else if (step === 1) {
      const valid = await partiesForm.trigger();
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    console.log("Token present:", !!localStorage.getItem("kanoonedge_token"));
    try {
      const created = await api.caseRooms.create({
        title: caseValues.title,
        case_number: caseValues.caseNumber,
        court: caseValues.court,
        case_type: caseValues.caseType,
        stage: caseValues.stage,
        next_hearing: caseValues.nextHearing,
        parties: partiesValues
          .filter((p) => p.name)
          .map((p) => ({ name: p.name, role: p.role, notes: p.notes || "" })),
      });

      // Upload required documents
      for (const [category, file] of Object.entries(requiredFiles)) {
        if (file) {
          await api.documents.upload(created.id, file, category, true);
        }
      }

      // Upload additional (optional) documents
      for (const file of additionalFiles) {
        await api.documents.upload(created.id, file);
      }

      router.push(`/dashboard/case-rooms/${created.id}`);
    } catch (err) {
      console.error("Create case room error:", err);
      setError(err instanceof Error ? err.message : "Failed to create case room");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 pt-[5vh]">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-border/50">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">New Case Room</h2>
                <p className="text-xs text-muted-foreground">Create a structured legal workspace</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <CardContent className="p-6 pt-4">
            <StepTracker current={step} />

            <AnimatePresence mode="wait">
              {/* ─── STEP 0: Case Info ──────────────────── */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Case Title <span className="text-danger">*</span>
                    </label>
                    <Input
                      placeholder="e.g. State vs Rahul Sharma"
                      {...caseForm.register("title")}
                    />
                    {caseForm.formState.errors.title && (
                      <p className="text-xs text-danger mt-1">{caseForm.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Case Number <span className="text-danger">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Sessions Case 234/2024"
                        {...caseForm.register("caseNumber")}
                      />
                      {caseForm.formState.errors.caseNumber && (
                        <p className="text-xs text-danger mt-1">{caseForm.formState.errors.caseNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Court Name <span className="text-danger">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Sessions Court Saket"
                        {...caseForm.register("court")}
                      />
                      {caseForm.formState.errors.court && (
                        <p className="text-xs text-danger mt-1">{caseForm.formState.errors.court.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Case Type <span className="text-danger">*</span>
                      </label>
                      <select
                        {...caseForm.register("caseType")}
                        className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select type</option>
                        {CASE_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {caseForm.formState.errors.caseType && (
                        <p className="text-xs text-danger mt-1">{caseForm.formState.errors.caseType.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Case Stage <span className="text-danger">*</span>
                      </label>
                      <select
                        {...caseForm.register("stage")}
                        className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select stage</option>
                        {CASE_STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {caseForm.formState.errors.stage && (
                        <p className="text-xs text-danger mt-1">{caseForm.formState.errors.stage.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Next Hearing Date <span className="text-danger">*</span>
                    </label>
                    <Input
                      type="date"
                      {...caseForm.register("nextHearing")}
                    />
                    {caseForm.formState.errors.nextHearing && (
                      <p className="text-xs text-danger mt-1">{caseForm.formState.errors.nextHearing.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─── STEP 1: Parties ────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Add the parties involved in this case. You can add more later.
                  </p>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="rounded-lg border border-border p-4 space-y-3 bg-card/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Party {idx + 1}
                          </span>
                          {fields.length > 1 && (
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => remove(idx)}>
                              <Trash2 className="w-3.5 h-3.5 text-danger" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Input
                              placeholder="Full name"
                              {...partiesForm.register(`parties.${idx}.name`)}
                            />
                            {partiesForm.formState.errors.parties?.[idx]?.name && (
                              <p className="text-xs text-danger mt-1">
                                {partiesForm.formState.errors.parties[idx]?.name?.message}
                              </p>
                            )}
                          </div>
                          <select
                            {...partiesForm.register(`parties.${idx}.role`)}
                            className="h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Select role</option>
                            {PARTY_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          placeholder="Additional notes (optional)"
                          {...partiesForm.register(`parties.${idx}.notes`)}
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", role: "", notes: "" })}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Party
                  </Button>
                </motion.div>
              )}

              {/* ─── STEP 2: Documents ──────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Required Documents Section */}
                  {requiredDocs.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Required Documents</h3>
                          <p className="text-xs text-muted-foreground">
                            Upload all required documents before creating the case room.
                          </p>
                        </div>
                        <Badge variant={allRequiredUploaded ? "default" : "destructive"} className="text-[10px]">
                          {Object.values(requiredFiles).filter(Boolean).length}/{requiredDocs.length} uploaded
                        </Badge>
                      </div>

                      {!allRequiredUploaded && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-destructive">
                            All required documents must be uploaded to create the case room.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {requiredDocs.map((doc) => {
                          const file = requiredFiles[doc.category];
                          const hasFile = file != null;
                          return (
                            <div
                              key={doc.category}
                              className={`rounded-lg border p-3 transition-colors ${
                                hasFile
                                  ? "border-green-500/50 bg-green-500/5"
                                  : "border-destructive/30 bg-destructive/5"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Status indicator */}
                                <div className="shrink-0">
                                  {hasFile ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-destructive" />
                                  )}
                                </div>

                                {/* Doc info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{doc.label}</p>
                                  {hasFile ? (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                                  )}
                                </div>

                                {/* Action */}
                                <div className="shrink-0">
                                  {hasFile ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7"
                                      onClick={() => handleRequiredFileChange(doc.category, null)}
                                    >
                                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  ) : (
                                    <label>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) handleRequiredFileChange(doc.category, f);
                                          e.target.value = "";
                                        }}
                                      />
                                      <Button variant="outline" size="sm" asChild>
                                        <span>
                                          <Upload className="w-3 h-3 mr-1" />
                                          Upload
                                        </span>
                                      </Button>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {requiredDocs.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Select a case type in Step 1 to see required documents.
                      </p>
                    </div>
                  )}

                  {/* Additional Documents Section */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Additional Documents</h3>
                      <p className="text-xs text-muted-foreground">
                        Upload any supporting evidence or additional files (optional).
                      </p>
                    </div>

                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-foreground font-medium mb-1">Drag and drop files here</p>
                      <p className="text-xs text-muted-foreground mb-3">PDF, DOCX, JPG, PNG — up to 50 MB</p>
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

                    {additionalFiles.length > 0 && (
                      <div className="space-y-2">
                        {additionalFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50"
                          >
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => removeAdditionalFile(idx)}>
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─── STEP 3: Review ─────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Case Info Summary */}
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Case Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Title:</span>{" "}
                        <span className="text-foreground">{caseValues.title || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Number:</span>{" "}
                        <span className="text-foreground">{caseValues.caseNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Court:</span>{" "}
                        <span className="text-foreground">{caseValues.court || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hearing:</span>{" "}
                        <span className="text-foreground">{caseValues.nextHearing || "—"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {caseValues.caseType && <Badge variant="secondary">{caseValues.caseType}</Badge>}
                      {caseValues.stage && <Badge variant="secondary">{caseValues.stage}</Badge>}
                    </div>
                  </div>

                  {/* Parties Summary */}
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Parties ({partiesValues.filter((p) => p.name).length})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {partiesValues
                        .filter((p) => p.name)
                        .map((party, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {party.role || "—"}
                            </Badge>
                            <span className="text-foreground">{party.name}</span>
                            {party.notes && (
                              <span className="text-muted-foreground text-xs">— {party.notes}</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Documents Summary */}
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Upload className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Documents</h3>
                    </div>

                    {/* Required docs */}
                    {requiredDocs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Required ({Object.values(requiredFiles).filter(Boolean).length}/{requiredDocs.length})
                        </p>
                        {requiredDocs.map((doc) => {
                          const file = requiredFiles[doc.category];
                          return (
                            <div key={doc.category} className="flex items-center gap-2 text-sm">
                              {file ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-destructive shrink-0" />
                              )}
                              <span className="text-foreground">{doc.label}</span>
                              {file && (
                                <span className="text-muted-foreground text-xs truncate">— {file.name}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Additional docs */}
                    {additionalFiles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Additional ({additionalFiles.length})
                        </p>
                        {additionalFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-foreground truncate">{f.name}</span>
                            <span className="text-muted-foreground text-xs shrink-0">
                              {(f.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {requiredDocs.length === 0 && additionalFiles.length === 0 && (
                      <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                    )}

                    {!allRequiredUploaded && requiredDocs.length > 0 && (
                      <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">
                          Missing required documents — go back to Step 3 to upload.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
              <div>
                {step > 0 && (
                  <Button variant="outline" onClick={goBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                {step < 3 ? (
                  <Button onClick={goNext}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleCreate} disabled={submitting || !allRequiredUploaded}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create Case Room
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
