"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Search, ExternalLink, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function LegalDatabasePage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState("All");
  const [dateRange, setDateRange] = useState("All time");
  const [selectedCaseId, setSelectedCaseId] = useState("");

  const { data: caseRooms = [] } = useQuery({
    queryKey: ["case-rooms"],
    queryFn: api.caseRooms.getAll,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["legal-search", submittedQuery],
    queryFn: () => api.legalSearch.search(submittedQuery, 0),
    enabled: submittedQuery.trim().length > 1,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { caseId: string; title: string; summary: string; citation: string; url: string }) => {
      return api.research.create(payload.caseId, {
        title: payload.title,
        research_type: "case_law",
        summary: `${payload.summary}\n\nSource: ${payload.url}`,
        citation: payload.citation,
        court_name: "Indian Kanoon",
        relevance: "medium",
      });
    },
  });

  const filteredResults = useMemo(() => {
    const results = data?.results || [];
    return results.filter((r) => {
      if (courtFilter !== "All" && !r.court.toLowerCase().includes(courtFilter.toLowerCase())) return false;
      if (dateRange === "All time" || !r.date) return true;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) return true;
      const years = dateRange === "Last 1 year" ? 1 : dateRange === "Last 5 years" ? 5 : 10;
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - years);
      return d >= cutoff;
    });
  }, [data, courtFilter, dateRange]);

  const submitSearch = () => {
    if (query.trim().length > 1) setSubmittedQuery(query.trim());
  };

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Legal Database</h1>
        <p className="text-muted-foreground">
          Search Indian judgments, precedents, and statutory context
        </p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch();
          }}
          placeholder="Search by case name, citation, or section (e.g. 'Section 498A bail', 'Arnesh Kumar 2014')"
          className="pl-12 h-12 text-base"
        />
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <select
          value={courtFilter}
          onChange={(e) => setCourtFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
        >
          <option>All</option>
          <option>Supreme Court</option>
          <option>High Court</option>
          <option>District Court</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
        >
          <option>All time</option>
          <option>Last 1 year</option>
          <option>Last 5 years</option>
          <option>Last 10 years</option>
        </select>
        <select
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
        >
          <option value="">Select case room to save</option>
          {caseRooms.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <Button onClick={submitSearch} disabled={query.trim().length < 2}>
          {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Search
        </Button>
      </div>

      <Card>
        <CardContent className="py-6 space-y-4">
          {submittedQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <BookOpen className="w-16 h-16 text-border mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Search the Legal Database</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Enter a legal query to search IndianKanoon and save relevant judgments directly to your case research notes.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found for this query and filter set.</p>
          ) : (
            filteredResults.map((r, idx) => (
              <div key={`${r.url}-${idx}`} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{r.title}</p>
                  {r.citation ? <Badge variant="outline">{r.citation}</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">{r.court || "Indian Kanoon"} {r.date ? `• ${r.date}` : ""}</p>
                <p className="text-sm text-muted-foreground">{r.summary || "No summary available."}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Full Judgment
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      saveMutation.mutate({
                        caseId: selectedCaseId,
                        title: r.title,
                        summary: r.summary,
                        citation: r.citation,
                        url: r.url,
                      })
                    }
                    disabled={!selectedCaseId || saveMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save to Research
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
