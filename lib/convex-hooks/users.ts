"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";

// ============ USER HOOKS ============

/**
 * Get user by email from Convex.
 * Named useConvexCurrentUser to avoid collision with useCurrentUser from lib/store.ts
 */
export function useConvexCurrentUser(email: string | undefined) {
  return useQuery(
    api.users.getByEmail,
    email ? { email } : "skip"
  );
}

export function useCreateUser() {
  const mutation = useMutation(api.users.create);
  return useCallback(
    (args: {
      email: string;
      name?: string;
      avatarUrl?: string;
      workosId?: string;
    }) => mutation(args),
    [mutation]
  );
}
