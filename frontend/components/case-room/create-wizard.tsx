"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  Scale,
  X,
  FolderOpen,
  Calendar,
  ClipboardCheck,
  AlertTriangle,
  Shield,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CaseType, CaseStage, PartyRole, CourtLevel, LawyerSide, ChecklistValue, SectionClassification, ClientListItem } from "@/types";
import { api } from "@/lib/api";

// ─── Schemas ─────────────────────────────────────────────────

const step1Schema = z.object({
  title: z.string().min(3, "Case title is required"),
  caseNumber: z.string().optional(),
  court: z.string().min(2, "Court name is required"),
  caseType: z.string().min(1, "Select case type"),
  stage: z.string().min(1, "Select case stage"),
  courtLevel: z.string().optional(),
  lawyerSide: z.string().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  opposingCounsel: z.string().optional(),
  caseDescription: z.string().optional(),
  priority: z.string().optional(),
  judgeName: z.string().optional(),
  courtNumber: z.string().optional(),
});

const step2Schema = z.object({
  incidentDate: z.string().optional(),
  firDate: z.string().optional(),
  firNumber: z.string().optional(),
  policeStation: z.string().optional(),
  arrestDate: z.string().optional(),
  inCustody: z.boolean().optional(),
  custodyStartDate: z.string().optional(),
  chargeSheetDate: z.string().optional(),
  nextHearing: z.string().min(1, "Next hearing date is required"),
  hearingPurpose: z.string().optional(),
  filingDate: z.string().optional(),
  filingNumber: z.string().optional(),
});

const step3Schema = z.object({
  checklist41aNotice: z.string().optional(),
  checklistGroundsOfArrest: z.string().optional(),
  checklistMagistrate24hrs: z.string().optional(),
  checklistRemandCaseDiary: z.string().optional(),
  checklistIndependentWitness: z.string().optional(),
});

const step4Schema = z.object({
  parties: z
    .array(
      z.object({
        name: z.string().min(2, "Name is required"),
        role: z.string().min(1, "Select a role"),
        notes: z.string().optional(),
      })
    )
    .min(1, "Add at least one party"),
  applicableSections: z.string().optional(),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;
type Step4Form = z.infer<typeof step4Schema>;

const CASE_TYPES: CaseType[] = ["Criminal", "Civil", "Civil - Tax", "Civil - Property", "Corporate", "Family", "Property", "Bail", "Writ", "Labour", "Other"];
const CASE_STAGES: CaseStage[] = ["Investigation", "Pre-Arrest", "Bail Stage", "Bail", "Charge Framing", "Evidence", "Arguments", "Trial", "Mediation", "Discovery", "Appeal", "Judgment Pending"];
const PARTY_ROLES: PartyRole[] = ["Accused", "Petitioner", "Respondent", "Complainant", "Witness", "Lawyer"];
const COURT_LEVELS: CourtLevel[] = ["Magistrate", "Sessions", "High Court", "Supreme Court", "Tribunal", "Other"];
const LAWYER_SIDES: LawyerSide[] = ["defence", "prosecution", "petitioner", "respondent"];

// ─── Date calculation helpers ────────────────────────────────

function parseFlexibleDate(value: string): Date | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  // Accept ISO first (yyyy-mm-dd), which is what backend and native date pickers use.
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Accept dd/mm/yyyy and dd-mm-yyyy for manual typing.
  const dmyMatch = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(dateA: string, dateB: string): number | null {
  if (!dateA || !dateB) return null;
  const a = parseFlexibleDate(dateA);
  const b = parseFlexibleDate(dateB);
  if (!a || !b) return null;
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function daysFromToday(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = parseFlexibleDate(dateStr);
  if (!d) return null;
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Progress Tracker ────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Case Identity", icon: Scale },
  { id: 1, label: "Dates", icon: Calendar },
  { id: 2, label: "Checklist", icon: ClipboardCheck },
  { id: 3, label: "Parties & Sections", icon: Users },
] as const;

function StepTracker({ current, isCriminal }: { current: number; isCriminal: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        if (i === 2 && !isCriminal) return null;
        const Icon = step.icon;
        const isActive = i === current;
        const isComplete = i < current || (i === 2 && !isCriminal && current >= 3);
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
                {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && !(i === 1 && !isCriminal) && !(i === 2 && !isCriminal) && (
              <div className={`w-12 sm:w-20 h-[2px] mx-2 mb-5 transition-colors duration-300 ${isComplete ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Checklist Item Component ────────────────────────────────

function ChecklistItem({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: ChecklistValue | undefined;
  onChange: (v: ChecklistValue) => void;
}) {
  const options: { val: ChecklistValue; label: string; color: string }[] = [
    { val: "yes", label: "Yes", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { val: "no", label: "No", color: "bg-red-500/20 text-red-400 border-red-500/30" },
    { val: "unknown", label: "Don't Know", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ];

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2 mt-2">
        {options.map((opt) => (
          <Button
            key={opt.val}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(opt.val)}
            className={`text-xs ${value === opt.val ? opt.color + " border" : ""}`}
          >
            {opt.label}
          </Button>
        ))}
      </div>
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
  const [sectionClassifications, setSectionClassifications] = useState<SectionClassification[]>([]);
  const [clientMode, setClientMode] = useState<"manual" | "existing" | "new">("manual");
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchDebounced, setClientSearchDebounced] = useState("");
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");
  const [selectedExistingClientLabel, setSelectedExistingClientLabel] = useState("");
  const [newClient, setNewClient] = useState({
    full_name: "",
    primary_phone: "",
    date_of_birth: "",
    occupation: "",
  });

  // Step 1 — Case Identity
  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { title: "", caseNumber: "", court: "", caseType: "", stage: "", courtLevel: "", lawyerSide: "", clientName: "", clientPhone: "", clientEmail: "", opposingCounsel: "", caseDescription: "", priority: "", judgeName: "", courtNumber: "" },
  });

  // Step 2 — Critical Dates
  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { incidentDate: "", firDate: "", firNumber: "", policeStation: "", arrestDate: "", inCustody: false, custodyStartDate: "", chargeSheetDate: "", nextHearing: "", hearingPurpose: "", filingDate: "", filingNumber: "" },
  });

  // Step 3 — Procedural Checklist
  const step3Form = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: { checklist41aNotice: "", checklistGroundsOfArrest: "", checklistMagistrate24hrs: "", checklistRemandCaseDiary: "", checklistIndependentWitness: "" },
  });

  // Step 4 — Parties + Sections
  const step4Form = useForm<Step4Form>({
    resolver: zodResolver(step4Schema),
    defaultValues: { parties: [{ name: "", role: "", notes: "" }], applicableSections: "" },
  });
  const { fields, append, remove } = useFieldArray({ control: step4Form.control, name: "parties" });

  const s1 = step1Form.watch();
  const s2 = step2Form.watch();
  const s3 = step3Form.watch();
  const s4 = step4Form.watch();

  const isCriminal = ["Criminal", "Bail"].includes(s1.caseType);

  useEffect(() => {
    const t = setTimeout(() => setClientSearchDebounced(clientSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const { data: clientSearchResults = [] } = useQuery({
    queryKey: ["wizard-client-search", clientSearchDebounced],
    queryFn: () => api.client.list(clientSearchDebounced),
    enabled: clientMode === "existing" && clientSearchDebounced.length > 0,
  });

  // Date pills
  const firDelay = useMemo(() => daysBetween(s2.incidentDate || "", s2.firDate || ""), [s2.incidentDate, s2.firDate]);
  const custodyDaysCalc = useMemo(() => {
    if (!s2.inCustody || !s2.custodyStartDate) return null;
    const d = daysFromToday(s2.custodyStartDate);
    return d !== null ? Math.abs(d) : null;
  }, [s2.inCustody, s2.custodyStartDate]);
  const daysToHearing = useMemo(() => daysFromToday(s2.nextHearing), [s2.nextHearing]);

  // Loophole counter
  const loopholeCount = useMemo(() => {
    let count = 0;
    if (s3.checklist41aNotice === "no") count++;
    if (s3.checklistGroundsOfArrest === "no") count++;
    if (s3.checklistMagistrate24hrs === "no") count++;
    if (s3.checklistRemandCaseDiary === "no") count++;
    if (s3.checklistIndependentWitness === "no") count++;
    return count;
  }, [s3]);

  // Live section classification
  useEffect(() => {
    const sections = s4.applicableSections?.trim();
    if (!sections) { setSectionClassifications([]); return; }
    const sectionList = sections.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (sectionList.length === 0) { setSectionClassifications([]); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await api.caseRooms.classifySections(sectionList);
        setSectionClassifications(result);
      } catch { setSectionClassifications([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [s4.applicableSections]);

  // Navigation
  const goNext = async () => {
    if (step === 0) { if (!(await step1Form.trigger())) return; }
    else if (step === 1) { if (!(await step2Form.trigger())) return; }
    if (step === 1 && !isCriminal) { setStep(3); }
    else { setStep((s) => Math.min(s + 1, 3)); }
  };

  const goBack = () => {
    if (step === 3 && !isCriminal) setStep(1);
    else setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreate = async () => {
    if (!(await step4Form.trigger())) return;

    if (clientMode === "existing" && !selectedExistingClientId) {
      setError("Please select an existing client.");
      return;
    }
    if (clientMode === "new" && (!newClient.full_name.trim() || !newClient.primary_phone.trim())) {
      setError("New client requires full name and primary phone.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const sectionsStr = s4.applicableSections?.trim();
      const applicableSections = sectionsStr ? sectionsStr.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined;

      let clientId: string | undefined;
      let clientData: Record<string, unknown> | undefined;

      if (clientMode === "existing") {
        clientId = selectedExistingClientId || undefined;
      } else if (clientMode === "new") {
        clientData = {
          full_name: newClient.full_name,
          primary_phone: newClient.primary_phone,
          date_of_birth: newClient.date_of_birth || undefined,
          occupation: newClient.occupation || undefined,
        };
      }

      const roleBySide: Record<string, string> = {
        defence: "Accused",
        prosecution: "Complainant",
        petitioner: "Petitioner",
        respondent: "Respondent",
      };
      const clientPartyRole = roleBySide[(s1.lawyerSide || "").toLowerCase()] || "Petitioner";

      const clientNameForParty =
        clientMode === "new"
          ? newClient.full_name
          : clientMode === "existing"
          ? selectedExistingClientLabel
          : s1.clientName;

      const partiesPayload = s4.parties
        .filter((p) => p.name)
        .map((p) => ({ name: p.name, role: p.role, notes: p.notes || "" }));

      if (clientNameForParty) {
        const hasClientParty = partiesPayload.some(
          (p) => p.name.trim().toLowerCase() === clientNameForParty.trim().toLowerCase()
        );
        if (!hasClientParty) {
          partiesPayload.unshift({
            name: clientNameForParty,
            role: clientPartyRole,
            notes: "Auto-filled from linked client",
          });
        }
      }

      const created = await api.caseRooms.create({
        title: s1.title,
        case_number: s1.caseNumber || undefined,
        court: s1.court,
        case_type: s1.caseType,
        stage: s1.stage,
        court_level: s1.courtLevel || undefined,
        lawyer_side: s1.lawyerSide || undefined,
        client_name: s1.clientName || undefined,
        client_phone: s1.clientPhone || undefined,
        client_email: s1.clientEmail || undefined,
        client_id: clientId,
        client_data: clientData,
        opposing_counsel: s1.opposingCounsel || undefined,
        case_description: s1.caseDescription || undefined,
        priority: s1.priority || undefined,
        judge_name: s1.judgeName || undefined,
        court_number: s1.courtNumber || undefined,
        incident_date: s2.incidentDate || undefined,
        fir_date: s2.firDate || undefined,
        fir_number: s2.firNumber || undefined,
        police_station: s2.policeStation || undefined,
        arrest_date: s2.arrestDate || undefined,
        in_custody: s2.inCustody || false,
        custody_start_date: s2.custodyStartDate || undefined,
        charge_sheet_date: s2.chargeSheetDate || undefined,
        next_hearing: s2.nextHearing,
        hearing_purpose: s2.hearingPurpose || undefined,
        filing_date: s2.filingDate || undefined,
        filing_number: s2.filingNumber || undefined,
        checklist_41a_notice: (isCriminal ? s3.checklist41aNotice : undefined) || undefined,
        checklist_grounds_of_arrest: (isCriminal ? s3.checklistGroundsOfArrest : undefined) || undefined,
        checklist_magistrate_24hrs: (isCriminal ? s3.checklistMagistrate24hrs : undefined) || undefined,
        checklist_remand_case_diary: (isCriminal ? s3.checklistRemandCaseDiary : undefined) || undefined,
        checklist_independent_witness: (isCriminal ? s3.checklistIndependentWitness : undefined) || undefined,
        applicable_sections: applicableSections,
        parties: partiesPayload,
      });

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
            <StepTracker current={step} isCriminal={isCriminal} />

            <AnimatePresence mode="wait">
              {/* ─── STEP 0: Case Identity ─────────────── */}
              {step === 0 && (
                <motion.div key="step-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Case Title <span className="text-danger">*</span></label>
                    <Input placeholder="e.g. State vs Rahul Sharma" {...step1Form.register("title")} />
                    {step1Form.formState.errors.title && <p className="text-xs text-danger mt-1">{step1Form.formState.errors.title.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Case Number</label>
                      <Input placeholder="e.g. Sessions 234/2024" {...step1Form.register("caseNumber")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Court Name <span className="text-danger">*</span></label>
                      <Input placeholder="e.g. Sessions Court Saket" {...step1Form.register("court")} />
                      {step1Form.formState.errors.court && <p className="text-xs text-danger mt-1">{step1Form.formState.errors.court.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Case Type <span className="text-danger">*</span></label>
                      <select {...step1Form.register("caseType")} className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Select type</option>
                        {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {step1Form.formState.errors.caseType && <p className="text-xs text-danger mt-1">{step1Form.formState.errors.caseType.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Case Stage <span className="text-danger">*</span></label>
                      <select {...step1Form.register("stage")} className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Select stage</option>
                        {CASE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {step1Form.formState.errors.stage && <p className="text-xs text-danger mt-1">{step1Form.formState.errors.stage.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Court Level</label>
                      <select {...step1Form.register("courtLevel")} className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Select level</option>
                        {COURT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">You represent</label>
                      <select {...step1Form.register("lawyerSide")} className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Select side</option>
                        {LAWYER_SIDES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Client Name</label>
                      <Input placeholder="e.g. Rahul Sharma" {...step1Form.register("clientName")} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Client Phone</label>
                      <Input placeholder="+91 98765 43210" {...step1Form.register("clientPhone")} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Case Description</label>
                    <textarea {...step1Form.register("caseDescription")} placeholder="Brief description..." className="w-full min-h-[60px] rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  </div>
                </motion.div>
              )}

              {/* ─── STEP 1: Critical Dates ────────────── */}
              {step === 1 && (
                <motion.div key="step-1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <p className="text-sm text-muted-foreground">Enter key dates. We&apos;ll auto-build your timeline and calculate deadlines.</p>

                  {isCriminal && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Incident/Offence Date</label>
                          <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("incidentDate")} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">FIR Date</label>
                          <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("firDate")} />
                        </div>
                      </div>

                      {firDelay !== null && firDelay > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${firDelay > 2 ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                          <Clock className="w-4 h-4" />
                          FIR filed {firDelay} day{firDelay !== 1 ? "s" : ""} after incident{firDelay > 2 && " — potential defence argument"}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">FIR Number</label>
                          <Input placeholder="e.g. FIR/123/2024" {...step2Form.register("firNumber")} />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Police Station</label>
                          <Input placeholder="e.g. Saket PS" {...step2Form.register("policeStation")} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Arrest Date</label>
                          <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("arrestDate")} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Charge Sheet Date</label>
                          <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("chargeSheetDate")} />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input type="checkbox" {...step2Form.register("inCustody")} className="rounded border-border" />
                          Currently in custody
                        </label>
                        {s2.inCustody && (
                          <div className="flex-1">
                            <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("custodyStartDate")} />
                          </div>
                        )}
                      </div>

                      {custodyDaysCalc !== null && custodyDaysCalc > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${custodyDaysCalc > 60 ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                          <Shield className="w-4 h-4" />
                          In custody for {custodyDaysCalc} day{custodyDaysCalc !== 1 ? "s" : ""}{custodyDaysCalc > 60 && " — check default bail eligibility"}
                        </div>
                      )}
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Next Hearing Date <span className="text-danger">*</span></label>
                      <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("nextHearing")} />
                      {step2Form.formState.errors.nextHearing && <p className="text-xs text-danger mt-1">{step2Form.formState.errors.nextHearing.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Hearing Purpose</label>
                      <Input placeholder="e.g. Bail arguments" {...step2Form.register("hearingPurpose")} />
                    </div>
                  </div>

                  {daysToHearing !== null && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${daysToHearing <= 1 ? "bg-red-500/10 text-red-400" : daysToHearing <= 3 ? "bg-orange-500/10 text-orange-400" : "bg-muted text-muted-foreground"}`}>
                      <Calendar className="w-4 h-4" />
                      {daysToHearing <= 0 ? "Hearing is today or overdue!" : `${daysToHearing} day${daysToHearing !== 1 ? "s" : ""} to hearing`}
                    </div>
                  )}

                  {!isCriminal && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Filing Date</label>
                        <Input placeholder="YYYY-MM-DD or DD/MM/YYYY" {...step2Form.register("filingDate")} />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Filing Number</label>
                        <Input placeholder="e.g. SC/123/2024" {...step2Form.register("filingNumber")} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── STEP 2: Procedural Checklist ──────── */}
              {step === 2 && isCriminal && (
                <motion.div key="step-2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Answer these procedural questions. Each &ldquo;No&rdquo; is a potential loophole.</p>
                    {loopholeCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {loopholeCount} loophole{loopholeCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    <ChecklistItem
                      label="Was Section 41A CrPC notice served before arrest?"
                      description="Mandatory for offences with max punishment < 7 years (Arnesh Kumar vs State of Bihar)"
                      value={s3.checklist41aNotice as ChecklistValue}
                      onChange={(v) => step3Form.setValue("checklist41aNotice", v)}
                    />
                    <ChecklistItem
                      label="Were the grounds of arrest communicated?"
                      description="Article 22(1) of Constitution — must inform reason for arrest"
                      value={s3.checklistGroundsOfArrest as ChecklistValue}
                      onChange={(v) => step3Form.setValue("checklistGroundsOfArrest", v)}
                    />
                    <ChecklistItem
                      label="Produced before Magistrate within 24 hours?"
                      description="Article 22(2) — mandatory production within 24 hours"
                      value={s3.checklistMagistrate24hrs as ChecklistValue}
                      onChange={(v) => step3Form.setValue("checklistMagistrate24hrs", v)}
                    />
                    <ChecklistItem
                      label="Case diary shown during remand hearing?"
                      description="Required under Section 167 CrPC for judicial remand"
                      value={s3.checklistRemandCaseDiary as ChecklistValue}
                      onChange={(v) => step3Form.setValue("checklistRemandCaseDiary", v)}
                    />
                    <ChecklistItem
                      label="Independent witness during panchnama?"
                      description="Required for search and seizure under CrPC"
                      value={s3.checklistIndependentWitness as ChecklistValue}
                      onChange={(v) => step3Form.setValue("checklistIndependentWitness", v)}
                    />
                  </div>
                </motion.div>
              )}

              {/* ─── STEP 3: Parties & Sections ────────── */}
              {step === 3 && (
                <motion.div key="step-3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <div className="space-y-3 rounded-lg border border-border p-3 bg-card/40">
                    <p className="text-sm font-medium text-foreground">Link Client</p>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center gap-2"><input type="radio" checked={clientMode === "existing"} onChange={() => setClientMode("existing")} /> Search existing client</label>
                      <label className="flex items-center gap-2"><input type="radio" checked={clientMode === "new"} onChange={() => setClientMode("new")} /> Create new client</label>
                      <label className="flex items-center gap-2"><input type="radio" checked={clientMode === "manual"} onChange={() => setClientMode("manual")} /> Add manually</label>
                    </div>

                    {clientMode === "existing" ? (
                      <div className="space-y-2">
                        <Input placeholder="Search by name or phone" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                        {clientSearchResults.length > 0 ? (
                          <div className="max-h-32 overflow-auto rounded-md border p-2 space-y-1">
                            {clientSearchResults.map((c: ClientListItem) => (
                              <button
                                key={c.id}
                                className={`w-full text-left rounded px-2 py-1 ${selectedExistingClientId === c.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
                                onClick={() => {
                                  setSelectedExistingClientId(c.id);
                                  setSelectedExistingClientLabel(c.full_name);
                                }}
                              >
                                <p className="text-sm font-medium">{c.full_name}</p>
                                <p className="text-xs text-muted-foreground">{c.primary_phone}</p>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {clientMode === "new" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Full name *" value={newClient.full_name} onChange={(e) => setNewClient((s) => ({ ...s, full_name: e.target.value }))} />
                        <Input placeholder="Primary phone *" value={newClient.primary_phone} onChange={(e) => setNewClient((s) => ({ ...s, primary_phone: e.target.value }))} />
                        <Input placeholder="Date of birth" value={newClient.date_of_birth} onChange={(e) => setNewClient((s) => ({ ...s, date_of_birth: e.target.value }))} />
                        <Input placeholder="Occupation" value={newClient.occupation} onChange={(e) => setNewClient((s) => ({ ...s, occupation: e.target.value }))} />
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Parties Involved</p>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                      {fields.map((field, idx) => (
                        <div key={field.id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Party {idx + 1}</span>
                            {fields.length > 1 && (
                              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => remove(idx)}>
                                <Trash2 className="w-3.5 h-3.5 text-danger" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Input placeholder="Full name" {...step4Form.register(`parties.${idx}.name`)} />
                              {step4Form.formState.errors.parties?.[idx]?.name && <p className="text-xs text-danger mt-1">{step4Form.formState.errors.parties[idx]?.name?.message}</p>}
                            </div>
                            <select {...step4Form.register(`parties.${idx}.role`)} className="h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                              <option value="">Select role</option>
                              {PARTY_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => append({ name: "", role: "", notes: "" })} className="w-full">
                      <Plus className="w-4 h-4 mr-2" /> Add Party
                    </Button>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Applicable Sections (comma-separated)</label>
                      <Input placeholder="e.g. 302, 498A, IPC 120B, NDPS 21" {...step4Form.register("applicableSections")} />
                      <p className="text-xs text-muted-foreground mt-1">Type sections — we&apos;ll classify them instantly</p>
                    </div>

                    {sectionClassifications.length > 0 && (
                      <div className="space-y-2">
                        {sectionClassifications.map((sec, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${sec.found ? (sec.over_7_years ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5") : "border-border bg-muted/50"}`}>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground">{sec.raw}</span>
                              {sec.found && <span className="text-muted-foreground ml-2">— {sec.title}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {sec.found ? (
                                <>
                                  <Badge variant={sec.bailable === "Yes" ? "secondary" : "destructive"} className="text-[10px]">{sec.bailable === "Yes" ? "Bailable" : "Non-Bail"}</Badge>
                                  <Badge variant={sec.over_7_years ? "destructive" : "secondary"} className="text-[10px]">{sec.max_punishment}</Badge>
                                </>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Not found</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              {step > 0 ? (
                <Button variant="ghost" onClick={goBack} disabled={submitting}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              ) : <div />}

              {step < 3 ? (
                <Button onClick={goNext} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : (<><CheckCircle2 className="w-4 h-4 mr-2" />Create Case Room</>)}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
