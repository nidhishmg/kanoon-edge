"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TabErrorBoundaryProps {
  tabName: string;
  children: React.ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
}

export class TabErrorBoundary extends React.Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): TabErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`TabErrorBoundary(${this.props.tabName})`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mt-4 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {this.props.tabName} tab failed to load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Something went wrong while rendering this section. You can retry without losing the rest of your workspace.
            </p>
            <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false })}>
              Retry Tab
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
