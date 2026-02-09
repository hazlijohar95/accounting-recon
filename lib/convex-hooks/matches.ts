"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ MATCH HOOKS ============

export function useSessionMatches(
  sessionId: Id<"reconciliationSessions"> | undefined,
  status?: "pending" | "approved" | "rejected",
  workosUserId?: string
) {
  return useQuery(
    api.matches.listBySession,
    sessionId ? withWorkosUserId({ sessionId, status }, workosUserId) : "skip"
  );
}

export function useMatchCounts(sessionId: Id<"reconciliationSessions"> | undefined, workosUserId?: string) {
  return useQuery(
    api.matches.getCounts,
    sessionId ? withWorkosUserId({ sessionId }, workosUserId) : "skip"
  );
}

export function useApproveMatch() {
  const mutation = useMutation(api.matches.approve);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"matchedPairs">, reviewerId?: Id<"users">) =>
      mutation(withWorkosUserId({ id, reviewerId }, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useRejectMatch() {
  const mutation = useMutation(api.matches.reject);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"matchedPairs">, reviewerId?: Id<"users">) =>
      mutation(withWorkosUserId({ id, reviewerId }, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useApproveHighConfidenceMatches() {
  const mutation = useMutation(api.matches.approveHighConfidence);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (sessionId: Id<"reconciliationSessions">, reviewerId?: Id<"users">) =>
      mutation(withWorkosUserId({ sessionId, reviewerId }, workosUserId)),
    [mutation, workosUserId]
  );
}

// ============ MATCHING HOOKS ============

export function useRunMatching() {
  const action = useAction(api.sessions.runMatching);
  return useCallback(
    (sessionId: Id<"reconciliationSessions">, useLLM?: boolean) =>
      action({ sessionId, useLLM }),
    [action]
  );
}

export function usePreviewMatching() {
  const action = useAction(api.sessions.previewMatching);
  return useCallback(
    (sessionId: Id<"reconciliationSessions">) => action({ sessionId }),
    [action]
  );
}
