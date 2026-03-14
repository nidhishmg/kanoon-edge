"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseRoomWorkspace } from "@/components/case-room/workspace";
import { useCaseRoomStore } from "@/lib/store";

export default function CaseRoomPage({
  params,
}: {
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const setActiveTab = useCaseRoomStore((s) => s.setActiveTab);
  const setClientTabTargetSection = useCaseRoomStore((s) => s.setClientTabTargetSection);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "client") {
      setActiveTab("client");
      const section = searchParams.get("section");
      if (section === "profile" || section === "document-requests" || section === "messages") {
        setClientTabTargetSection(section);
      }
    }
  }, [searchParams, setActiveTab, setClientTabTargetSection]);

  const { data: caseRoom, isLoading } = useQuery({
    queryKey: ["case-room", params.id],
    queryFn: () => api.caseRooms.getById(params.id),
  });

  if (isLoading) {
    return (
      <div className="max-w-container mx-auto space-y-6">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[40px] w-[400px]" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!caseRoom) {
    return (
      <div className="max-w-container mx-auto text-center py-20">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Case Room Not Found
        </h2>
        <p className="text-muted-foreground">
          The case room you are looking for does not exist.
        </p>
      </div>
    );
  }

  return <CaseRoomWorkspace caseRoom={caseRoom} />;
}
