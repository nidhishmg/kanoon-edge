import {
  CaseRoom,
  Document,
  AnalysisResult,
  AnalysisProgress,
  ChatMessage,
  DraftTemplate,
  TimelineEvent,
  DashboardStats,
  User,
} from "@/types";

export const mockUser: User = {
  id: "1",
  name: "Advocate Rahul",
  email: "rahul@kanoonedge.com",
  plan: "pro",
};

export const mockStats: DashboardStats = {
  caseRooms: 12,
  hearingsToday: 3,
  aiAnalyses: 47,
  draftsGenerated: 28,
};

export const mockCaseRooms: CaseRoom[] = [
  {
    id: "cr-001",
    title: "State vs. Rajesh Kumar",
    caseNumber: "CR/2024/1847",
    court: "Delhi High Court",
    caseType: "Criminal",
    stage: "Evidence",
    documentCount: 14,
    loopholesDetected: 7,
    nextHearing: "2026-03-15",
    strength: 78,
    status: "active",
    createdAt: "2024-11-15",
    parties: [
      { id: "p1", name: "State of Delhi", role: "Complainant" },
      { id: "p2", name: "Rajesh Kumar", role: "Accused" },
      { id: "p3", name: "Hon. Justice Priya Sharma", role: "Lawyer" },
      { id: "p4", name: "SI Ramesh Kumar", role: "Witness", notes: "Investigating Officer" },
    ],
    venue: "Court Room 12, Delhi High Court, Shershah Road, New Delhi",
  },
  {
    id: "cr-002",
    title: "Mehta Industries vs. Tax Authority",
    caseNumber: "CW/2025/0392",
    court: "Bombay High Court",
    caseType: "Civil - Tax",
    stage: "Arguments",
    documentCount: 23,
    loopholesDetected: 4,
    nextHearing: "2026-03-22",
    strength: 65,
    status: "active",
    createdAt: "2025-01-10",
    parties: [
      { id: "p5", name: "Mehta Industries Pvt. Ltd.", role: "Petitioner" },
      { id: "p6", name: "Commissioner of Income Tax", role: "Respondent" },
      { id: "p7", name: "Hon. Justice Anil Deshmukh", role: "Lawyer" },
    ],
    venue: "Court Room 5, Bombay High Court, Fort, Mumbai",
  },
  {
    id: "cr-003",
    title: "Priya Sharma Divorce Petition",
    caseNumber: "FC/2025/0156",
    court: "Family Court, Bangalore",
    caseType: "Family",
    stage: "Mediation",
    documentCount: 8,
    loopholesDetected: 2,
    nextHearing: "2026-04-01",
    strength: 82,
    status: "active",
    createdAt: "2025-02-20",
    parties: [
      { id: "p8", name: "Priya Sharma", role: "Petitioner" },
      { id: "p9", name: "Vikram Sharma", role: "Respondent" },
      { id: "p10", name: "Hon. Justice Meena Kumari", role: "Lawyer" },
    ],
    venue: "Mediation Room 3, Family Court Complex, Bangalore",
  },
  {
    id: "cr-004",
    title: "Greenfield Corp. Land Dispute",
    caseNumber: "CS/2024/2341",
    court: "Madras High Court",
    caseType: "Civil - Property",
    stage: "Discovery",
    documentCount: 31,
    loopholesDetected: 11,
    nextHearing: "2026-03-18",
    strength: 45,
    status: "active",
    createdAt: "2024-09-05",
    parties: [
      { id: "p11", name: "Greenfield Corp.", role: "Petitioner" },
      { id: "p12", name: "Tamil Nadu Housing Board", role: "Respondent" },
      { id: "p13", name: "Hon. Justice Venkatesh", role: "Lawyer" },
    ],
    venue: "Court Room 8, Madras High Court, Chennai",
  },
];

export const mockDocuments: Document[] = [
  {
    id: "doc-001",
    name: "FIR_Copy_2024.pdf",
    type: "FIR",
    size: "2.4 MB",
    uploadDate: "2025-01-15",
    status: "analyzed",
    pages: 12,
  },
  {
    id: "doc-002",
    name: "Witness_Statement_1.pdf",
    type: "Witness Statement",
    size: "1.8 MB",
    uploadDate: "2025-01-16",
    status: "analyzed",
    pages: 8,
  },
  {
    id: "doc-003",
    name: "Medical_Report.pdf",
    type: "Medical Report",
    size: "4.2 MB",
    uploadDate: "2025-01-18",
    status: "analyzed",
    pages: 24,
  },
  {
    id: "doc-004",
    name: "Charge_Sheet.pdf",
    type: "Charge Sheet",
    size: "3.1 MB",
    uploadDate: "2025-01-20",
    status: "processing",
    pages: 45,
  },
  {
    id: "doc-005",
    name: "Previous_Judgment.pdf",
    type: "Judgment",
    size: "5.6 MB",
    uploadDate: "2025-02-01",
    status: "uploaded",
    pages: 67,
  },
];

export const analysisStages: AnalysisProgress[] = [
  { stage: "reading", label: "Reading documents", complete: false },
  { stage: "extracting", label: "Extracting key legal entities", complete: false },
  { stage: "compliance", label: "Checking procedural compliance", complete: false },
  { stage: "contradictions", label: "Detecting contradictions", complete: false },
  { stage: "precedents", label: "Searching relevant precedents", complete: false },
  { stage: "timeline", label: "Building case timeline", complete: false },
];

export const mockAnalysisResults: AnalysisResult[] = [
  {
    id: "ar-001",
    type: "loophole",
    severity: "high",
    title: "Missing Mandatory Witness Signature on FIR",
    description:
      "The FIR document lacks the mandatory witness signature as required under Section 154 of CrPC. The investigating officer's endorsement is present, but no independent witness has signed the document.",
    legalBasis: "Section 154 CrPC, Lalita Kumari vs. Govt. of UP (2014) 2 SCC 1",
    guidance:
      "This can be used to challenge the admissibility of the FIR. File an application under Section 227 CrPC for discharge citing procedural irregularity.",
    documentRef: "FIR_Copy_2024.pdf",
    page: 3,
  },
  {
    id: "ar-002",
    type: "contradiction",
    severity: "high",
    title: "Timeline Inconsistency Between FIR and Witness Statement",
    description:
      "The FIR states the incident occurred at 10:30 PM, while the witness statement mentions 8:45 PM. This 1 hour 45 minute discrepancy undermines the prosecution's timeline.",
    legalBasis: "Section 145 of the Indian Evidence Act",
    guidance:
      "Cross-examine the witness on this contradiction during the evidence stage. Reference the exact time discrepancy to establish unreliability.",
    documentRef: "Witness_Statement_1.pdf",
    page: 5,
  },
  {
    id: "ar-003",
    type: "argument",
    severity: "medium",
    title: "Medical Report Supports Alternative Theory",
    description:
      "The medical examination report indicates injuries consistent with a fall rather than assault. The doctor's observations mention 'abrasions consistent with lateral impact on rough surface.'",
    legalBasis: "Modi's Medical Jurisprudence, Chapter 12",
    guidance:
      "Engage a forensic medical expert to provide an independent opinion. This evidence supports the defense theory of accidental injury.",
    documentRef: "Medical_Report.pdf",
    page: 7,
  },
  {
    id: "ar-004",
    type: "gap",
    severity: "medium",
    title: "No CCTV Footage Referenced in Investigation",
    description:
      "The incident location is a commercial area likely to have CCTV coverage. However, no effort to obtain or reference CCTV footage appears in the charge sheet or investigation documents.",
    legalBasis:
      "Tomaso Bruno vs. State of UP (2015) 7 SCC 178 (duty to collect electronic evidence)",
    guidance:
      "File an application under Section 91 CrPC directing the investigating officer to collect and preserve CCTV footage from the vicinity.",
    documentRef: "Charge_Sheet.pdf",
    page: 12,
  },
  {
    id: "ar-005",
    type: "loophole",
    severity: "low",
    title: "Delay in Filing Charge Sheet",
    description:
      "The charge sheet was filed 95 days after the FIR, exceeding the 90-day limit for cases where the accused is in judicial custody under Section 167(2) CrPC.",
    legalBasis: "Section 167(2) CrPC, Uday Mohanlal Acharya vs. State of Maharashtra (2001) 5 SCC 453",
    guidance:
      "The accused has a right to default bail under Section 167(2). File an application immediately if bail has not been obtained on this ground.",
    documentRef: "Charge_Sheet.pdf",
    page: 1,
  },
];

export const mockTimeline: TimelineEvent[] = [
  {
    id: "te-001",
    title: "FIR Filed",
    date: "2024-10-15",
    description: "FIR No. 847/2024 filed at Saket PS",
    status: "completed",
  },
  {
    id: "te-002",
    title: "Arrest",
    date: "2024-10-16",
    description: "Accused arrested and produced before CMM",
    status: "completed",
  },
  {
    id: "te-003",
    title: "Bail Hearing",
    date: "2024-10-30",
    description: "Bail granted by Sessions Court",
    status: "completed",
  },
  {
    id: "te-004",
    title: "Charge Sheet Filed",
    date: "2025-01-18",
    description: "Charge sheet filed under Sections 302, 120B IPC",
    status: "completed",
  },
  {
    id: "te-005",
    title: "Charges Framed",
    date: "2025-06-15",
    description: "Charges framed, accused pleaded not guilty",
    status: "completed",
  },
  {
    id: "te-006",
    title: "Evidence Stage",
    date: "2026-03-15",
    description: "Prosecution evidence — next witness examination",
    status: "current",
  },
  {
    id: "te-007",
    title: "Arguments",
    date: "2026-06-01",
    description: "Final arguments expected",
    status: "upcoming",
  },
];

export const mockDraftTemplates: DraftTemplate[] = [
  {
    id: "dt-001",
    name: "Bail Application",
    description: "Application for regular bail under Section 439 CrPC",
    category: "Criminal",
    icon: "FileText",
  },
  {
    id: "dt-002",
    name: "Written Statement",
    description: "Defense written statement for civil suits",
    category: "Civil",
    icon: "FileEdit",
  },
  {
    id: "dt-003",
    name: "Appeal Memo",
    description: "Memorandum of appeal for High Court",
    category: "Appeal",
    icon: "Scale",
  },
  {
    id: "dt-004",
    name: "Writ Petition",
    description: "Writ petition under Article 226/227",
    category: "Constitutional",
    icon: "Gavel",
  },
  {
    id: "dt-005",
    name: "Legal Notice",
    description: "Pre-litigation legal notice under CPC",
    category: "General",
    icon: "Mail",
  },
  {
    id: "dt-006",
    name: "Vakalatnama",
    description: "Power of attorney for legal representation",
    category: "General",
    icon: "UserCheck",
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: "cm-001",
    role: "assistant",
    content:
      "Welcome to this Case Room. I have analyzed 14 documents related to State vs. Rajesh Kumar. I found 7 legal loopholes and 2 contradictions. What would you like to know?",
    timestamp: "2026-03-08T09:00:00",
  },
];

export const mockSuggestedQuestions = [
  "What are the strongest arguments for the defense?",
  "Summarize all contradictions found in witness statements",
  "What is the timeline of events according to the FIR?",
  "Are there grounds for bail modification?",
  "What precedents support our defense theory?",
  "Identify all procedural violations by the prosecution",
];
