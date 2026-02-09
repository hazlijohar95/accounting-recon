export type OnboardingChecklistCompletion = {
  company: boolean;
  upload: boolean;
  match: boolean;
  review: boolean;
  export: boolean;
};

export type OnboardingChecklistInputs = {
  companiesCount: number;
  documentCount: number;
  sessionCount: number;
  hasReviewedMatch: boolean;
  completedItems: string[];
};

export function getOnboardingChecklistCompletion({
  companiesCount,
  documentCount,
  sessionCount,
  hasReviewedMatch,
  completedItems,
}: OnboardingChecklistInputs): OnboardingChecklistCompletion {
  return {
    company: companiesCount > 0,
    upload: documentCount > 0,
    match: sessionCount > 0,
    review: hasReviewedMatch,
    export: completedItems.includes("export"),
  };
}

export function getChecklistProgress(completion: OnboardingChecklistCompletion) {
  const completedCount = Object.values(completion).filter(Boolean).length;
  const totalCount = Object.keys(completion).length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    totalCount,
    progressPercent,
    isAllComplete: completedCount === totalCount,
  };
}
