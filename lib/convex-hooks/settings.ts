"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";

// ============ ONBOARDING HOOKS ============

export function useOnboardingProgress(enabled: boolean) {
  return useQuery(api.onboarding.getProgress, enabled ? {} : "skip");
}

export function useSaveOnboardingProgress() {
  const mutation = useMutation(api.onboarding.saveProgress);
  return useCallback(
    (args: {
      currentStep: number;
      data: {
        companyName?: string;
        industryCategory?: string;
        taxRegistered?: string;
        taxNumber?: string;
        primaryBank?: string;
        fiscalYearEnd?: string;
      };
      isCompleted?: boolean;
    }) => mutation(args),
    [mutation]
  );
}

export function useMarkOnboardingCompleted() {
  const mutation = useMutation(api.onboarding.markCompleted);
  return useCallback(
    () => mutation({}),
    [mutation]
  );
}

export function useDeleteOnboardingProgress() {
  const mutation = useMutation(api.onboarding.deleteProgress);
  return useCallback(
    () => mutation({}),
    [mutation]
  );
}

// ============ USER PREFERENCES HOOKS ============

export interface UserPreferences {
  theme: string;
  dateFormat: string;
  numberFormat: string;
  emailNotifications: {
    reconciliationComplete: boolean;
    weeklyDigest: boolean;
    newFeatures: boolean;
  };
}

/**
 * Hook to get user preferences with real-time updates.
 * Returns default values for unauthenticated users.
 */
export function useUserPreferences() {
  return useQuery(api.settings.getUserPreferences);
}

/**
 * Hook to update user preferences.
 * Supports partial updates - only pass the fields you want to change.
 */
export function useUpdateUserPreferences() {
  const mutation = useMutation(api.settings.updateUserPreferences);
  return useCallback(
    (args: {
      dateFormat?: string;
      numberFormat?: string;
      emailReconciliation?: boolean;
      emailWeeklyDigest?: boolean;
      emailProductUpdates?: boolean;
    }) => mutation(args),
    [mutation]
  );
}
