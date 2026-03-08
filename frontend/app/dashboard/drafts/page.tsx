"use client";

import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DraftsPage() {
  return (
    <div className="max-w-container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Drafts</h1>
          <p className="text-muted-foreground">
            All your generated legal documents
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Draft
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <FileText className="w-16 h-16 text-border mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No drafts yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Generate drafts from within a Case Room. Select any case,
            go to the Draft tab, and the AI will create court-ready documents.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
