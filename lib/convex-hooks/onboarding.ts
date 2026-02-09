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
