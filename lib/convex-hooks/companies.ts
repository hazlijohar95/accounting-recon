"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ COMPANY HOOKS ============

export function useCompany(id: Id<"companies"> | undefined, workosUserId?: string) {
  return useQuery(
    api.companies.get,
    id ? withWorkosUserId({ id }, workosUserId) : "skip"
  );
}

/**
 * Hook to fetch companies for a user.
 * Prefers workosUserId for authentication lookup.
 * The backend will resolve workosUserId to the user's Convex _id.
 */
export function useUserCompanies(
  ownerId: Id<"users"> | undefined,
  workosUserId?: string
) {
  // Always include workosUserId if available, as it's the primary auth mechanism
  const queryArgs = ownerId
    ? withWorkosUserId({ ownerId }, workosUserId)
    : null;

  return useQuery(
    api.companies.listByOwner,
    queryArgs ?? "skip"
  );
}

export function useCreateCompany() {
  const mutation = useMutation(api.companies.create);
  return useCallback(
    (args: {
      name: string;
      registrationNumber?: string;
      industry?: string;
      fiscalYearEnd?: string;
      bankName?: string;
      currency: string;
      ownerId: Id<"users">;
    }) => mutation(args),
    [mutation]
  );
}

export function useUpdateCompany() {
  const mutation = useMutation(api.companies.update);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      id: Id<"companies">;
      name?: string;
      registrationNumber?: string;
      industry?: string;
      fiscalYearEnd?: string;
      bankName?: string;
      currency?: string;
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useDeleteCompany() {
  const mutation = useMutation(api.companies.remove);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"companies">) => mutation(withWorkosUserId({ id }, workosUserId)),
    [mutation, workosUserId]
  );
}
