/**
 * Filter Persistence Module
 *
 * Utilities for persisting filter state to URL search params.
 * Enables shareable filtered views and preserves state on refresh.
 *
 * @module lib/filter-persistence
 */

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ============================================================================
// Type Definitions
// ============================================================================

export type FilterValue = string | number | boolean | string[] | null;

export interface FilterState {
  [key: string]: FilterValue;
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serialize a filter value to a URL-safe string
 */
export function serializeFilterValue(value: FilterValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.join(",");
  }

  if (typeof value === "string") {
    if (value === "") return null;
    return value;
  }

  return null;
}

/**
 * Deserialize a URL string to a filter value
 */
export function deserializeFilterValue(
  value: string | null,
  type: "string" | "number" | "boolean" | "array" = "string"
): FilterValue {
  if (value === null) {
    return null;
  }

  switch (type) {
    case "boolean":
      return value === "true";

    case "number":
      const num = parseFloat(value);
      return isNaN(num) ? null : num;

    case "array":
      return value.split(",").filter((v) => v !== "");

    case "string":
    default:
      return value;
  }
}

/**
 * Serialize filters to URLSearchParams
 */
export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    const serialized = serializeFilterValue(value);
    if (serialized !== null) {
      params.set(key, serialized);
    }
  }

  return params;
}

/**
 * Deserialize URLSearchParams to filters with type hints
 */
export function deserializeFilters<T extends FilterState>(
  searchParams: URLSearchParams,
  typeHints: Partial<Record<keyof T, "string" | "number" | "boolean" | "array">>
): Partial<T> {
  const filters: Partial<T> = {};

  searchParams.forEach((value, key) => {
    const type = typeHints[key as keyof T] || "string";
    const deserialized = deserializeFilterValue(value, type);
    if (deserialized !== null) {
      (filters as Record<string, FilterValue>)[key] = deserialized;
    }
  });

  return filters;
}

// ============================================================================
// React Hook
// ============================================================================

export interface UsePersistedFiltersOptions<T extends FilterState> {
  /** Type hints for deserializing filter values */
  typeHints?: Partial<Record<keyof T, "string" | "number" | "boolean" | "array">>;
  /** Whether to replace or push history state */
  replace?: boolean;
  /** Debounce delay in ms for URL updates */
  debounceMs?: number;
}

/**
 * Hook for persisting filter state to URL search params
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = usePersistedFilters({
 *   status: "pending",
 *   minAmount: null,
 *   showApproved: true,
 * }, {
 *   typeHints: {
 *     minAmount: "number",
 *     showApproved: "boolean",
 *   }
 * });
 * ```
 */
export function usePersistedFilters<T extends FilterState>(
  defaultFilters: T,
  options: UsePersistedFiltersOptions<T> = {}
): [T, (filters: Partial<T>) => void, () => void] {
  const { typeHints = {}, replace = true } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Deserialize current URL params to filter state
  const currentFilters = useMemo((): T => {
    const urlFilters = deserializeFilters<T>(searchParams, typeHints);

    // Merge with defaults
    return {
      ...defaultFilters,
      ...urlFilters,
    };
  }, [searchParams, defaultFilters, typeHints]);

  // Update filters and sync to URL
  const setFilters = useCallback(
    (newFilters: Partial<T>) => {
      const merged = {
        ...currentFilters,
        ...newFilters,
      };

      // Serialize to URL params
      const params = serializeFilters(merged);

      // Update URL
      const url = `${pathname}?${params.toString()}`;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [currentFilters, pathname, router, replace]
  );

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    const params = serializeFilters(defaultFilters);
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  }, [defaultFilters, pathname, router, replace]);

  return [currentFilters, setFilters, resetFilters];
}

// ============================================================================
// Reconciliation-Specific Filters
// ============================================================================

export interface ReconcileFilterState {
  status?: string;
  type?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  confidence?: string;
  layer?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const RECONCILE_FILTER_TYPE_HINTS: Partial<
  Record<keyof ReconcileFilterState, "string" | "number" | "boolean" | "array">
> = {
  minAmount: "number",
  maxAmount: "number",
};

/**
 * Hook specifically for reconciliation view filters
 */
export function useReconcileFilters(
  defaults: ReconcileFilterState = {}
): [ReconcileFilterState, (filters: Partial<ReconcileFilterState>) => void, () => void] {
  const defaultFilters: ReconcileFilterState = {
    status: "all",
    type: "all",
    sortBy: "date",
    sortDir: "desc",
    ...defaults,
  };

  return usePersistedFilters(defaultFilters as FilterState, {
    typeHints: RECONCILE_FILTER_TYPE_HINTS,
  }) as unknown as [ReconcileFilterState, (filters: Partial<ReconcileFilterState>) => void, () => void];
}

// ============================================================================
// Upload-Specific Filters
// ============================================================================

export interface UploadFilterState {
  documentType?: string;
  extractionStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Hook specifically for upload/documents view filters
 */
export function useUploadFilters(
  defaults: UploadFilterState = {}
): [UploadFilterState, (filters: Partial<UploadFilterState>) => void, () => void] {
  const defaultFilters: UploadFilterState = {
    documentType: "all",
    extractionStatus: "all",
    ...defaults,
  };

  return usePersistedFilters(defaultFilters as FilterState) as unknown as [UploadFilterState, (filters: Partial<UploadFilterState>) => void, () => void];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build URL with filters for sharing
 */
export function buildFilterUrl(
  baseUrl: string,
  filters: FilterState
): string {
  const params = serializeFilters(filters);
  const queryString = params.toString();

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Parse filters from a URL string
 */
export function parseFiltersFromUrl<T extends FilterState>(
  url: string,
  typeHints: Partial<Record<keyof T, "string" | "number" | "boolean" | "array">> = {}
): Partial<T> {
  try {
    const urlObj = new URL(url, "http://localhost");
    return deserializeFilters<T>(urlObj.searchParams, typeHints);
  } catch {
    return {};
  }
}

/**
 * Check if any filters are active (non-default)
 */
export function hasActiveFilters<T extends FilterState>(
  current: T,
  defaults: T
): boolean {
  for (const key of Object.keys(current) as (keyof T)[]) {
    const currentValue = current[key];
    const defaultValue = defaults[key];

    // Compare arrays
    if (Array.isArray(currentValue) && Array.isArray(defaultValue)) {
      if (
        currentValue.length !== defaultValue.length ||
        currentValue.some((v, i) => v !== defaultValue[i])
      ) {
        return true;
      }
      continue;
    }

    // Compare primitives
    if (currentValue !== defaultValue) {
      return true;
    }
  }

  return false;
}

/**
 * Count number of active filters
 */
export function countActiveFilters<T extends FilterState>(
  current: T,
  defaults: T
): number {
  let count = 0;

  for (const key of Object.keys(current) as (keyof T)[]) {
    const currentValue = current[key];
    const defaultValue = defaults[key];

    if (currentValue !== defaultValue) {
      count++;
    }
  }

  return count;
}
