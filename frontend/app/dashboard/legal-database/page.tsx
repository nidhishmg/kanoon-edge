"use client";

import { BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LegalDatabasePage() {
  return (
    <div className="max-w-container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Legal Database</h1>
        <p className="text-muted-foreground">
          Search Indian statutes, judgments, and legal precedents
        </p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search statutes, judgments, and legal provisions..."
          className="pl-12 h-12 text-base"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <BookOpen className="w-16 h-16 text-border mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Search the Legal Database
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Access thousands of Indian judgments, statutes, and legal
            provisions. Enter a search term above to begin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
