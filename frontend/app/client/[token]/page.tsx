"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Loader2, Lock, Calendar, MessageSquare, Upload, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function fmtDate(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
}

export default function ClientAccessPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const queryClient = useQueryClient();

  const sessionStorageKey = `kanoonedge_client_session_${token}`;
  const [sessionToken, setSessionToken] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem(sessionStorageKey) || "" : ""
  );

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [profileStep, setProfileStep] = useState(1);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    date_of_birth: "",
    primary_phone: "",
    occupation: "",
    permanent_address: "",
    current_address: "",
    aadhaar_last4: "",
    pan_number: "",
    passport_number: "",
    has_passport: false,
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_phone: "",
    family_dependents_count: "",
    prior_cases: false,
    currently_on_bail: false,
  });

  const [messageText, setMessageText] = useState("");

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["public-client-case", token, sessionToken],
    queryFn: () => api.clientPublic.getCaseSummary(token, sessionToken || undefined),
    retry: false,
  });

  const { data: documentRequests = [] } = useQuery({
    queryKey: ["public-client-documents", token, sessionToken],
    queryFn: () => api.clientPublic.listDocumentRequests(token, sessionToken || undefined),
    enabled: !!summary && (!summary.pin_enabled || !!sessionToken),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["public-client-messages", token, sessionToken],
    queryFn: () => api.clientPublic.listMessages(token, sessionToken || undefined),
    enabled: !!summary && summary.allow_client_messages && (!summary.pin_enabled || !!sessionToken),
    refetchInterval: 30000,
  });

  const verifyPinMutation = useMutation({
    mutationFn: () => api.clientPublic.verifyPin(token, pin),
    onSuccess: async (res) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(sessionStorageKey, res.session_token);
      }
      setSessionToken(res.session_token);
      setPinError("");
      await queryClient.invalidateQueries({ queryKey: ["public-client-case", token] });
    },
    onError: () => {
      setPinError("Too many attempts. Please contact your lawyer.");
    },
  });

  const submitProfileMutation = useMutation({
    mutationFn: () =>
      api.clientPublic.submitProfile(
        token,
        {
          ...profileForm,
          family_dependents_count: profileForm.family_dependents_count
            ? Number(profileForm.family_dependents_count)
            : undefined,
        },
        sessionToken || undefined
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["public-client-case", token] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ requestId, file }: { requestId: string; file: File }) =>
      api.clientPublic.uploadDocument(token, requestId, file, sessionToken || undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["public-client-documents", token] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => api.clientPublic.sendMessage(token, messageText.trim(), sessionToken || undefined),
    onSuccess: async () => {
      setMessageText("");
      await queryClient.invalidateQueries({ queryKey: ["public-client-messages", token] });
    },
  });

  const pendingDocs = useMemo(
    () => documentRequests.filter((d) => d.status === "requested" || d.status === "uploaded"),
    [documentRequests]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">This link is no longer active. Please contact your lawyer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summary.pin_enabled && !sessionToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-4 h-4" /> Verify PIN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            {pinError ? <p className="text-xs text-destructive">{pinError}</p> : null}
            <Button
              className="w-full"
              onClick={() => verifyPinMutation.mutate()}
              disabled={!pin || verifyPinMutation.isPending}
            >
              {verifyPinMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Verify
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-4">
      <div className="mx-auto w-full max-w-md space-y-3">
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">KanoonEdge</p>
          <p className="text-sm font-medium">Secure Case Update</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{summary.case_title || "Secure Case Update"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.case_stage ? <Badge variant="secondary">{summary.case_stage}</Badge> : null}
            {summary.next_hearing_date ? (
              <div className="rounded-md border p-3">
                <p className="font-medium">
                  Your next hearing is in {summary.days_until_next_hearing ?? "-"} days
                </p>
                <p className="text-muted-foreground">{fmtDate(summary.next_hearing_date)}</p>
                {summary.next_hearing_purpose ? (
                  <p className="text-muted-foreground mt-1">{summary.next_hearing_purpose}</p>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const text = `Hearing: ${summary.case_title} on ${summary.next_hearing_date}`;
                    window.open(
                      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}`,
                      "_blank"
                    );
                  }}
                >
                  <Calendar className="w-4 h-4 mr-1" /> Add to calendar
                </Button>
              </div>
            ) : null}
            {summary.case_summary ? <p className="text-muted-foreground">{summary.case_summary}</p> : null}
          </CardContent>
        </Card>

        {!summary.profile_complete ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Complete Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Step {profileStep} of 4</p>

              {profileStep === 1 ? (
                <div className="space-y-2">
                  <Input placeholder="Full name" value={profileForm.full_name} onChange={(e) => setProfileForm((s) => ({ ...s, full_name: e.target.value }))} />
                  <Input type="date" value={profileForm.date_of_birth} onChange={(e) => setProfileForm((s) => ({ ...s, date_of_birth: e.target.value }))} />
                  <Input placeholder="Phone" value={profileForm.primary_phone} onChange={(e) => setProfileForm((s) => ({ ...s, primary_phone: e.target.value }))} />
                  <Input placeholder="Occupation" value={profileForm.occupation} onChange={(e) => setProfileForm((s) => ({ ...s, occupation: e.target.value }))} />
                </div>
              ) : null}

              {profileStep === 2 ? (
                <div className="space-y-2">
                  <Input placeholder="Permanent address" value={profileForm.permanent_address} onChange={(e) => setProfileForm((s) => ({ ...s, permanent_address: e.target.value }))} />
                  <Input placeholder="Current address" value={profileForm.current_address} onChange={(e) => setProfileForm((s) => ({ ...s, current_address: e.target.value }))} />
                </div>
              ) : null}

              {profileStep === 3 ? (
                <div className="space-y-2">
                  <Input placeholder="Aadhaar last 4" value={profileForm.aadhaar_last4} onChange={(e) => setProfileForm((s) => ({ ...s, aadhaar_last4: e.target.value }))} />
                  <Input placeholder="PAN" value={profileForm.pan_number} onChange={(e) => setProfileForm((s) => ({ ...s, pan_number: e.target.value }))} />
                  <Input placeholder="Passport number" value={profileForm.passport_number} onChange={(e) => setProfileForm((s) => ({ ...s, passport_number: e.target.value }))} />
                </div>
              ) : null}

              {profileStep === 4 ? (
                <div className="space-y-2">
                  <Input placeholder="Emergency contact name" value={profileForm.emergency_contact_name} onChange={(e) => setProfileForm((s) => ({ ...s, emergency_contact_name: e.target.value }))} />
                  <Input placeholder="Relation" value={profileForm.emergency_contact_relation} onChange={(e) => setProfileForm((s) => ({ ...s, emergency_contact_relation: e.target.value }))} />
                  <Input placeholder="Emergency contact phone" value={profileForm.emergency_contact_phone} onChange={(e) => setProfileForm((s) => ({ ...s, emergency_contact_phone: e.target.value }))} />
                  <Input placeholder="Family dependents" value={profileForm.family_dependents_count} onChange={(e) => setProfileForm((s) => ({ ...s, family_dependents_count: e.target.value }))} />
                  <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={profileForm.prior_cases} onChange={(e) => setProfileForm((s) => ({ ...s, prior_cases: e.target.checked }))} /> Prior cases</label>
                  <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={profileForm.currently_on_bail} onChange={(e) => setProfileForm((s) => ({ ...s, currently_on_bail: e.target.checked }))} /> Currently on bail</label>
                </div>
              ) : null}

              <div className="flex gap-2">
                {profileStep > 1 ? (
                  <Button variant="outline" onClick={() => setProfileStep((s) => s - 1)}>
                    Back
                  </Button>
                ) : null}
                {profileStep < 4 ? (
                  <Button onClick={() => setProfileStep((s) => s + 1)} className="ml-auto">
                    Next
                  </Button>
                ) : (
                  <Button
                    className="ml-auto"
                    onClick={() => submitProfileMutation.mutate()}
                    disabled={submitProfileMutation.isPending || !profileForm.full_name || !profileForm.primary_phone}
                  >
                    {submitProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Submit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-5 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Profile Complete
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents Requested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents requested yet.</p>
            ) : (
              pendingDocs.map((r) => (
                <div key={r.id} className="rounded-md border p-3 text-sm space-y-2">
                  <p className="font-medium">{r.document_name}</p>
                  <p className="text-xs text-muted-foreground">{r.reason || "No reason provided"}</p>
                  <p className="text-xs text-muted-foreground">Due: {fmtDate(r.due_date)}</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate({ requestId: r.id, file });
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-1" /> Upload
                      </span>
                    </Button>
                  </label>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {summary.allow_client_messages ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="max-h-72 overflow-auto space-y-2 rounded-md border p-2 bg-secondary/10">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                      m.sender_type === "client"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-background border"
                    }`}
                  >
                    <p className="text-[10px] opacity-70 mb-1">{fmtDate(m.created_at)}</p>
                    <p>{m.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type message"
                  maxLength={500}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <Button
                  onClick={() => sendMessageMutation.mutate()}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-center text-xs text-muted-foreground py-2">Powered by KanoonEdge</p>
      </div>
    </div>
  );
}
