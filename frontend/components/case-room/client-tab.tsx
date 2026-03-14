"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Link as LinkIcon,
  FileText,
  MessageSquare,
  Lock,
  Copy,
  RefreshCcw,
  Trash2,
  Send,
  Paperclip,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CaseRoom, ClientListItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCaseRoomStore } from "@/lib/store";

interface ClientTabProps {
  caseRoom: CaseRoom;
}

const STATUS_CLASS: Record<string, string> = {
  requested: "secondary",
  uploaded: "warning",
  approved: "success",
  rejected: "destructive",
};

const DOC_SUGGESTIONS: Record<string, string[]> = {
  Criminal: [
    "Aadhaar Card",
    "Passport Copy",
    "Bank Statement (3 months)",
    "Employer Letter",
    "Property Documents",
    "Surety Declaration",
  ],
  Civil: ["Title Documents", "Sale Agreement", "Bank Statement", "Incorporation Certificate"],
  Family: ["Marriage Certificate", "Birth Certificates", "Bank Statements", "Property Documents"],
};

function fmtDate(v?: string) {
  if (!v) return "Not provided";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString();
}

function toClientPayload(input: Record<string, string>) {
  return {
    full_name: input.full_name || "",
    primary_phone: input.primary_phone || "",
    date_of_birth: input.date_of_birth || undefined,
    occupation: input.occupation || undefined,
    permanent_address: input.permanent_address || undefined,
    emergency_contact_name: input.emergency_contact_name || undefined,
    lawyer_notes: input.lawyer_notes || undefined,
  };
}

export function ClientTab({ caseRoom }: ClientTabProps) {
  const queryClient = useQueryClient();
  const clientTabTargetSection = useCaseRoomStore((s) => s.clientTabTargetSection);
  const setClientTabTargetSection = useCaseRoomStore((s) => s.setClientTabTargetSection);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const docRequestsRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [clientForm, setClientForm] = useState<Record<string, string>>({
    full_name: "",
    primary_phone: "",
    date_of_birth: "",
    occupation: "",
    permanent_address: "",
    emergency_contact_name: "",
    lawyer_notes: "",
  });

  const [linkSettingsOpen, setLinkSettingsOpen] = useState(false);
  const [linkSettings, setLinkSettings] = useState({
    show_hearing_date: true,
    show_case_stage: true,
    show_case_summary: false,
    allow_document_upload: true,
    allow_client_messages: true,
    require_profile_completion: true,
    pin_enabled: false,
    pin: "",
  });

  const [docForm, setDocForm] = useState({ document_name: "", reason: "", due_date: "" });
  const [messageText, setMessageText] = useState("");
  const [attachmentDocId, setAttachmentDocId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: caseData } = useQuery({
    queryKey: ["case-room", caseRoom.id],
    queryFn: () => api.caseRooms.getById(caseRoom.id),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", searchDebounced],
    queryFn: () => api.client.list(searchDebounced),
    enabled: searchDebounced.length > 0,
  });

  const { data: activeLink } = useQuery({
    queryKey: ["client-link", caseRoom.id],
    queryFn: () => api.client.getActiveLink(caseRoom.id),
  });

  const { data: documentRequests = [] } = useQuery({
    queryKey: ["client-document-requests", caseRoom.id],
    queryFn: () => api.client.listDocumentRequests(caseRoom.id),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["client-messages", caseRoom.id],
    queryFn: () => api.client.listMessages(caseRoom.id),
    refetchInterval: 30000,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", caseRoom.id],
    queryFn: () => api.documents.getByCaseId(caseRoom.id),
  });

  const linkedClient = caseData?.client;
  const isProfileComplete = !!linkedClient?.profileComplete;

  const pendingRequestCount = useMemo(
    () => documentRequests.filter((d) => d.status === "requested").length,
    [documentRequests]
  );

  const unreadCount = useMemo(
    () => messages.filter((m) => m.sender_type === "client" && !m.is_read).length,
    [messages]
  );

  const createClientMutation = useMutation({
    mutationFn: async () => {
      const created = await api.client.create(toClientPayload(clientForm));
      await api.client.linkToCase(caseRoom.id, created.id);
      return created;
    },
    onSuccess: async () => {
      setShowCreateClient(false);
      setClientForm({
        full_name: "",
        primary_phone: "",
        date_of_birth: "",
        occupation: "",
        permanent_address: "",
        emergency_contact_name: "",
        lawyer_notes: "",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["case-room", caseRoom.id] }),
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
      ]);
    },
  });

  const linkExistingMutation = useMutation({
    mutationFn: (clientId: string) => api.client.linkToCase(caseRoom.id, clientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["case-room", caseRoom.id] });
      setSearch("");
      setSearchDebounced("");
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!linkedClient) throw new Error("No linked client");
      return api.client.update(linkedClient.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["case-room", caseRoom.id] });
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: () => api.client.generateLink(caseRoom.id, linkSettings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-link", caseRoom.id] });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: () => api.client.updateLink(caseRoom.id, linkSettings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-link", caseRoom.id] });
    },
  });

  const revokeLinkMutation = useMutation({
    mutationFn: () => api.client.revokeLink(caseRoom.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-link", caseRoom.id] });
    },
  });

  const regenerateLinkMutation = useMutation({
    mutationFn: () => api.client.regenerateLink(caseRoom.id, linkSettings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-link", caseRoom.id] });
    },
  });

  const addRequestMutation = useMutation({
    mutationFn: () => api.client.createDocumentRequest(caseRoom.id, docForm),
    onSuccess: async () => {
      setDocForm({ document_name: "", reason: "", due_date: "" });
      await queryClient.invalidateQueries({ queryKey: ["client-document-requests", caseRoom.id] });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.client.updateDocumentRequest(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-document-requests", caseRoom.id] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      api.client.sendMessage(caseRoom.id, {
        content: messageText.trim(),
        attachment_document_id: attachmentDocId || undefined,
      }),
    onSuccess: async () => {
      setMessageText("");
      setAttachmentDocId("");
      await queryClient.invalidateQueries({ queryKey: ["client-messages", caseRoom.id] });
    },
  });

  const suggestedDocs = DOC_SUGGESTIONS[caseRoom.caseType] || DOC_SUGGESTIONS.Criminal;

  useEffect(() => {
    if (!clientTabTargetSection) return;

    const target =
      clientTabTargetSection === "profile"
        ? profileRef.current
        : clientTabTargetSection === "document-requests"
        ? docRequestsRef.current
        : messagesRef.current;

    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setClientTabTargetSection(null);
  }, [clientTabTargetSection, setClientTabTargetSection]);

  return (
    <div className="space-y-4">
      <div id="client-profile" ref={profileRef} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Client Profile
            <Badge variant={isProfileComplete ? "success" : "warning"}>
              {isProfileComplete ? "Profile Complete" : "Profile Pending"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!linkedClient ? (
            <>
              <p className="text-sm text-muted-foreground">
                No client linked to this case. Search for an existing client or create a new profile.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Input
                    placeholder="Search clients by name or phone"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {clients.length > 0 ? (
                    <div className="rounded-md border bg-secondary/20 p-2 space-y-1 max-h-40 overflow-auto">
                      {clients.map((c: ClientListItem) => (
                        <button
                          key={c.id}
                          className="w-full text-left rounded px-2 py-1 hover:bg-secondary"
                          onClick={() => linkExistingMutation.mutate(c.id)}
                        >
                          <p className="text-sm font-medium">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground">{c.primary_phone}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => setShowCreateClient((v) => !v)}>
                    {showCreateClient ? "Hide Form" : "Create New Client"}
                  </Button>
                </div>
              </div>

              {showCreateClient ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Full name *"
                    value={clientForm.full_name}
                    onChange={(e) => setClientForm((s) => ({ ...s, full_name: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone *"
                    value={clientForm.primary_phone}
                    onChange={(e) => setClientForm((s) => ({ ...s, primary_phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Date of birth"
                    value={clientForm.date_of_birth}
                    onChange={(e) => setClientForm((s) => ({ ...s, date_of_birth: e.target.value }))}
                  />
                  <Input
                    placeholder="Occupation"
                    value={clientForm.occupation}
                    onChange={(e) => setClientForm((s) => ({ ...s, occupation: e.target.value }))}
                  />
                  <Input
                    placeholder="Address"
                    value={clientForm.permanent_address}
                    onChange={(e) => setClientForm((s) => ({ ...s, permanent_address: e.target.value }))}
                  />
                  <Input
                    placeholder="Emergency contact"
                    value={clientForm.emergency_contact_name}
                    onChange={(e) => setClientForm((s) => ({ ...s, emergency_contact_name: e.target.value }))}
                  />
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Private notes"
                      value={clientForm.lawyer_notes}
                      onChange={(e) => setClientForm((s) => ({ ...s, lawyer_notes: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      disabled={!clientForm.full_name || !clientForm.primary_phone || createClientMutation.isPending}
                      onClick={() => createClientMutation.mutate()}
                    >
                      Save and Link Client
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{linkedClient.name || "Not provided"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{linkedClient.phone || "Not provided"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Profile</span><span>{linkedClient.profileComplete ? "Complete" : "Pending"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Unread Messages</span><span>{linkedClient.unreadMessageCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pending Doc Requests</span><span>{linkedClient.activeDocumentRequestCount}</span></div>
              </div>

              <div className="rounded-md border p-3 bg-secondary/20">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Private Notes (never shared with client)
                </p>
                <Input
                  value={clientForm.lawyer_notes}
                  placeholder="Private notes"
                  onChange={(e) => setClientForm((s) => ({ ...s, lawyer_notes: e.target.value }))}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => updateClientMutation.mutate({ lawyer_notes: clientForm.lawyer_notes })}
                  disabled={updateClientMutation.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="w-4 h-4" /> Client Access Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeLink ? (
            <>
              <p className="text-sm text-muted-foreground">
                Share a secure link with your client so they can provide details and upload documents.
              </p>
              <Button onClick={() => generateLinkMutation.mutate()} disabled={generateLinkMutation.isPending}>
                Generate Client Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLinkSettingsOpen((v) => !v)}>
                {linkSettingsOpen ? "Hide Settings" : "Link Settings"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Input value={activeLink.share_url} readOnly />
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(activeLink.share_url)}
                >
                  <Copy className="w-4 h-4 mr-1" /> Copy Link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Opened {activeLink.open_count} times. Last opened {activeLink.last_opened_at ? fmtDate(activeLink.last_opened_at) : "Never"}.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => regenerateLinkMutation.mutate()}>
                  <RefreshCcw className="w-4 h-4 mr-1" /> Regenerate Link
                </Button>
                <Button variant="destructive" onClick={() => revokeLinkMutation.mutate()}>
                  <Trash2 className="w-4 h-4 mr-1" /> Revoke Link
                </Button>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.show_hearing_date} onChange={(e) => setLinkSettings((s) => ({ ...s, show_hearing_date: e.target.checked }))} /> Show hearing date</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.show_case_stage} onChange={(e) => setLinkSettings((s) => ({ ...s, show_case_stage: e.target.checked }))} /> Show case stage</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.show_case_summary} onChange={(e) => setLinkSettings((s) => ({ ...s, show_case_summary: e.target.checked }))} /> Show case summary</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.allow_document_upload} onChange={(e) => setLinkSettings((s) => ({ ...s, allow_document_upload: e.target.checked }))} /> Allow document uploads</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.allow_client_messages} onChange={(e) => setLinkSettings((s) => ({ ...s, allow_client_messages: e.target.checked }))} /> Allow messages</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.require_profile_completion} onChange={(e) => setLinkSettings((s) => ({ ...s, require_profile_completion: e.target.checked }))} /> Require profile completion</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={linkSettings.pin_enabled} onChange={(e) => setLinkSettings((s) => ({ ...s, pin_enabled: e.target.checked }))} /> PIN protection</label>
            {linkSettings.pin_enabled ? (
              <Input
                placeholder="PIN"
                value={linkSettings.pin}
                onChange={(e) => setLinkSettings((s) => ({ ...s, pin: e.target.value }))}
              />
            ) : null}
          </div>
          {activeLink ? (
            <Button variant="outline" size="sm" onClick={() => updateLinkMutation.mutate()}>
              Save Link Settings
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div id="client-document-requests" ref={docRequestsRef} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" /> Documents Requested from Client
            <Badge variant="secondary">{pendingRequestCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Request documents from your client. They can upload directly from their phone.
            </p>
          ) : (
            <div className="space-y-2">
              {documentRequests.map((req) => (
                <div key={req.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{req.document_name}</p>
                    <Badge variant={(STATUS_CLASS[req.status] as never) || "secondary"}>{req.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{req.reason || "No reason provided"}</p>
                  <p className="text-xs text-muted-foreground">Due: {fmtDate(req.due_date)}</p>
                  {req.status === "uploaded" ? (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => updateRequestMutation.mutate({ id: req.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateRequestMutation.mutate({ id: req.id, status: "rejected" })}>Reject</Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Document name"
              value={docForm.document_name}
              onChange={(e) => setDocForm((s) => ({ ...s, document_name: e.target.value }))}
            />
            <Input
              placeholder="Reason"
              value={docForm.reason}
              onChange={(e) => setDocForm((s) => ({ ...s, reason: e.target.value }))}
            />
            <Input
              type="date"
              value={docForm.due_date}
              onChange={(e) => setDocForm((s) => ({ ...s, due_date: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedDocs.map((name) => (
              <button
                key={name}
                className="rounded-full border px-2 py-1 text-xs hover:bg-secondary"
                onClick={() => setDocForm((s) => ({ ...s, document_name: name }))}
              >
                {name}
              </button>
            ))}
          </div>
          <Button onClick={() => addRequestMutation.mutate()} disabled={!docForm.document_name || addRequestMutation.isPending}>
            Add Document Request
          </Button>
        </CardContent>
      </Card>
      </div>

      <div id="client-messages" ref={messagesRef} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4" /> Messages
            {unreadCount > 0 ? <Badge variant="destructive">{unreadCount}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeLink ? (
            <p className="text-sm text-muted-foreground">Generate the client link first to enable messaging.</p>
          ) : null}

          {activeLink && activeLink.open_count === 0 ? (
            <p className="text-xs text-muted-foreground">
              Client has not opened the link yet. Share the link to start communicating.
            </p>
          ) : null}

          <div className="max-h-80 overflow-auto space-y-2 rounded-md border p-3 bg-secondary/10">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Send your client a secure message about their case.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    m.sender_type === "lawyer"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-background border"
                  }`}
                >
                  <p className="text-[10px] opacity-80 mb-1">
                    {m.sender_type === "lawyer" ? "You" : (linkedClient?.name || "Client").split(" ")[0]} - {fmtDate(m.created_at)}
                  </p>
                  <p>{m.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="grid md:grid-cols-[1fr,220px,120px] gap-2">
            <Input
              placeholder="Type message..."
              maxLength={1000}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <select
                value={attachmentDocId}
                onChange={(e) => setAttachmentDocId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm"
              >
                <option value="">Attach case document</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <Button
              disabled={!messageText.trim() || sendMessageMutation.isPending || !activeLink}
              onClick={() => sendMessageMutation.mutate()}
            >
              <Send className="w-4 h-4 mr-1" /> Send
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
