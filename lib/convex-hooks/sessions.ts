"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ SESSION HOOKS ============

export function useSession(id: Id<"reconciliationSessions"> | undefined, workosUserId?: string) {
  return useQuery(
    api.sessions.get,
    id ? withWorkosUserId({ id }, workosUserId) : "skip"
  );
}

export function useSessionWithStats(id: Id<"reconciliationSessions"> | undefined, workosUserId?: string) {
  return useQuery(
    api.sessions.getWithStats,
    id ? withWorkosUserId({ id }, workosUserId) : "skip"
  );
}

export function useCompanySessions(
  companyId: Id<"companies"> | undefined,
  status?: "draft" | "processing" | "review" | "completed",
  workosUserId?: string
) {
  return useQuery(
    api.sessions.listByCompany,
    companyId
      ? withWorkosUserId({ companyId, status }, workosUserId)
      : "skip"
  );
}

export function useCreateSession() {
  const mutation = useMutation(api.sessions.create);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      name: string;
      periodStart?: string;
      periodEnd?: string;
      createdBy: Id<"users">;
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useUpdateSessionStatus() {
  const mutation = useMutation(api.sessions.updateStatus);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (
      id: Id<"reconciliationSessions">,
      status: "draft" | "processing" | "review" | "completed"
    ) => mutation(withWorkosUserId({ id, status }, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useUpdateSessionProgress() {
  const mutation = useMutation(api.sessions.updateProgress);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (
      id: Id<"reconciliationSessions">,
      progress: number,
      matchedCount?: number,
      suspenseCount?: number
    ) =>
      mutation(
        withWorkosUserId({ id, progress, matchedCount, suspenseCount }, workosUserId)
      ),
    [mutation, workosUserId]
  );
}

export function useDeleteSession() {
  const mutation = useMutation(api.sessions.remove);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"reconciliationSessions">) => mutation(withWorkosUserId({ id }, workosUserId)),
    [mutation, workosUserId]
  );
}
