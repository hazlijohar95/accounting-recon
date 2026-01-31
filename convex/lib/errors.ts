/**
 * Centralized error handling for Convex functions
 * Uses ConvexError for structured, client-parseable error responses
 */
import { ConvexError } from "convex/values";

// ============ ERROR CODES ============

// Authentication errors (1xxx)
export const AUTH_CODES = {
  UNAUTHORIZED: "AUTH_001",
  SESSION_EXPIRED: "AUTH_002",
  INVALID_TOKEN: "AUTH_003",
  SERVICE_UNAVAILABLE: "AUTH_004",
  USER_NOT_FOUND: "AUTH_005",
} as const;

// Resource errors (2xxx)
export const RESOURCE_CODES = {
  NOT_FOUND: "RESOURCE_001",
  DELETED: "RESOURCE_002",
  ALREADY_EXISTS: "RESOURCE_003",
  INVALID_STATE: "RESOURCE_004",
} as const;

// Permission errors (3xxx)
export const PERMISSION_CODES = {
  ACCESS_DENIED: "PERMISSION_001",
  OWNERSHIP_REQUIRED: "PERMISSION_002",
  GLOBAL_RESOURCE: "PERMISSION_003",
  RATE_LIMITED: "PERMISSION_004",
} as const;

// Validation errors (4xxx)
export const VALIDATION_CODES = {
  INVALID_INPUT: "VALIDATION_001",
  INVALID_FORMAT: "VALIDATION_002",
  MISSING_FIELD: "VALIDATION_003",
  OUT_OF_RANGE: "VALIDATION_004",
  INVALID_TYPE: "VALIDATION_005",
  BULK_LIMIT_EXCEEDED: "VALIDATION_006",
} as const;

// Business logic errors (5xxx)
export const BUSINESS_CODES = {
  SESSION_MISMATCH: "BUSINESS_001",
  INVALID_OPERATION: "BUSINESS_002",
  CONFLICT: "BUSINESS_003",
  EXTRACTION_FAILED: "BUSINESS_004",
  MATCHING_FAILED: "BUSINESS_005",
  RESOURCE_NOT_FOUND: "BUSINESS_006",
} as const;;

// External service errors (6xxx)
export const SERVICE_CODES = {
  BEDROCK_ERROR: "SERVICE_001",
  EXTRACTION_SERVICE_ERROR: "SERVICE_002",
  STORAGE_ERROR: "SERVICE_003",
} as const;

// ============ ERROR DATA TYPES ============

export type ErrorCode =
  | (typeof AUTH_CODES)[keyof typeof AUTH_CODES]
  | (typeof RESOURCE_CODES)[keyof typeof RESOURCE_CODES]
  | (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES]
  | (typeof VALIDATION_CODES)[keyof typeof VALIDATION_CODES]
  | (typeof BUSINESS_CODES)[keyof typeof BUSINESS_CODES]
  | (typeof SERVICE_CODES)[keyof typeof SERVICE_CODES];

// Convex-compatible error details (must be serializable as Convex Value)
export type ErrorDetails = Record<string, string | number | boolean | null>;

export interface ErrorData {
  code: ErrorCode;
  message: string;
  field?: string;
  resourceType?: string;
  resourceId?: string;
  details?: ErrorDetails;
}

// ============ ERROR HELPERS ============

/**
 * Throw a structured ConvexError with standardized format
 */
export function throwConvexError(
  code: ErrorCode,
  message: string,
  extra?: Omit<ErrorData, "code" | "message">
): never {
  throw new ConvexError({
    code,
    message,
    ...extra,
  });
}

// ============ AUTH ERROR HELPERS ============

export const AuthErrors = {
  unauthorized(message = "Please sign in to continue"): never {
    throwConvexError(AUTH_CODES.UNAUTHORIZED, message);
  },

  sessionExpired(): never {
    throwConvexError(AUTH_CODES.SESSION_EXPIRED, "Your session has expired. Please sign in again.");
  },

  invalidToken(): never {
    throwConvexError(AUTH_CODES.INVALID_TOKEN, "Invalid authentication token.");
  },

  serviceUnavailable(): never {
    throwConvexError(AUTH_CODES.SERVICE_UNAVAILABLE, "Authentication service unavailable.");
  },

  userNotFound(): never {
    throwConvexError(
      AUTH_CODES.USER_NOT_FOUND,
      "User not found in database. Please sign out and sign in again."
    );
  },
} as const;

// ============ RESOURCE ERROR HELPERS ============

export const ResourceErrors = {
  notFound(resourceType: string, resourceId?: string): never {
    throwConvexError(
      RESOURCE_CODES.NOT_FOUND,
      `${resourceType} not found`,
      { resourceType, resourceId }
    );
  },

  deleted(resourceType: string): never {
    throwConvexError(
      RESOURCE_CODES.DELETED,
      `${resourceType} has been deleted`,
      { resourceType }
    );
  },

  alreadyExists(resourceType: string, identifier?: string): never {
    throwConvexError(
      RESOURCE_CODES.ALREADY_EXISTS,
      `${resourceType} already exists${identifier ? `: ${identifier}` : ""}`,
      { resourceType }
    );
  },

  invalidState(resourceType: string, currentState: string, expectedState: string): never {
    throwConvexError(
      RESOURCE_CODES.INVALID_STATE,
      `${resourceType} is in ${currentState} state, expected ${expectedState}`,
      { resourceType, details: { currentState, expectedState } }
    );
  },
} as const;

// ============ PERMISSION ERROR HELPERS ============

export const PermissionErrors = {
  accessDenied(resourceType: string): never {
    throwConvexError(
      PERMISSION_CODES.ACCESS_DENIED,
      `You don't have access to this ${resourceType}`,
      { resourceType }
    );
  },

  ownershipRequired(resourceType: string): never {
    throwConvexError(
      PERMISSION_CODES.OWNERSHIP_REQUIRED,
      `You must own this ${resourceType} to perform this action`,
      { resourceType }
    );
  },

  globalResource(resourceType: string): never {
    throwConvexError(
      PERMISSION_CODES.GLOBAL_RESOURCE,
      `Global ${resourceType} cannot be modified`,
      { resourceType }
    );
  },

  rateLimited(): never {
    throwConvexError(
      PERMISSION_CODES.RATE_LIMITED,
      "Too many requests. Please try again later."
    );
  },
} as const;

// ============ VALIDATION ERROR HELPERS ============

export const ValidationErrors = {
  invalidInput(field: string, reason?: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_INPUT,
      reason ? `Invalid ${field}: ${reason}` : `Invalid ${field}`,
      { field }
    );
  },

  invalidFormat(field: string, expectedFormat: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_FORMAT,
      `Invalid ${field} format: expected ${expectedFormat}`,
      { field, details: { expectedFormat } }
    );
  },

  missingField(field: string): never {
    throwConvexError(
      VALIDATION_CODES.MISSING_FIELD,
      `${field} is required`,
      { field }
    );
  },

  outOfRange(field: string, min?: number, max?: number): never {
    let message = `${field} is out of range`;
    if (min !== undefined && max !== undefined) {
      message = `${field} must be between ${min} and ${max}`;
    } else if (min !== undefined) {
      message = `${field} must be at least ${min}`;
    } else if (max !== undefined) {
      message = `${field} must be at most ${max}`;
    }
    // Only include defined values in details
    const details: ErrorDetails = {};
    if (min !== undefined) details.min = min;
    if (max !== undefined) details.max = max;
    throwConvexError(VALIDATION_CODES.OUT_OF_RANGE, message, { field, details });
  },

  invalidType(field: string, expectedType: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_TYPE,
      `${field} must be a ${expectedType}`,
      { field, details: { expectedType } }
    );
  },

  bulkLimitExceeded(limit: number, provided: number): never {
    throwConvexError(
      VALIDATION_CODES.BULK_LIMIT_EXCEEDED,
      `Bulk operations limited to ${limit} items, received ${provided}`,
      { details: { limit, provided } }
    );
  },

  cannotBeEmpty(field: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_INPUT,
      `${field} cannot be empty`,
      { field }
    );
  },

  invalidCurrency(value: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_FORMAT,
      "Invalid currency: must be a 3-letter code (e.g., MYR, USD)",
      { field: "currency", details: { value } }
    );
  },

  invalidDate(field: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_FORMAT,
      `Invalid ${field}: not a valid date`,
      { field, details: { expectedFormat: "YYYY-MM-DD" } }
    );
  },

  invalidDateFormat(field: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_FORMAT,
      `Invalid ${field} format: expected YYYY-MM-DD`,
      { field, details: { expectedFormat: "YYYY-MM-DD" } }
    );
  },

  invalidAmount(field: string): never {
    throwConvexError(
      VALIDATION_CODES.INVALID_TYPE,
      `Invalid ${field}: must be a finite number`,
      { field, details: { expectedType: "finite number" } }
    );
  },
} as const;

// ============ BUSINESS ERROR HELPERS ============

export const BusinessErrors = {
  sessionMismatch(itemType: string): never {
    throwConvexError(
      BUSINESS_CODES.SESSION_MISMATCH,
      `${itemType} belongs to a different session`,
      { resourceType: itemType }
    );
  },

  invalidOperation(reason: string): never {
    throwConvexError(BUSINESS_CODES.INVALID_OPERATION, reason);
  },

  conflict(reason: string): never {
    throwConvexError(BUSINESS_CODES.CONFLICT, reason);
  },

  extractionFailed(reason: string): never {
    throwConvexError(BUSINESS_CODES.EXTRACTION_FAILED, reason);
  },

  matchingFailed(reason: string): never {
    throwConvexError(BUSINESS_CODES.MATCHING_FAILED, reason);
  },

  resourceNotFound(resourceType: string, resourceId: string): never {
    throwConvexError(
      BUSINESS_CODES.RESOURCE_NOT_FOUND,
      `${resourceType} not found: ${resourceId}`,
      { resourceType, resourceId }
    );
  },
} as const;;

// ============ SERVICE ERROR HELPERS ============

export const ServiceErrors = {
  bedrockError(message: string): never {
    throwConvexError(SERVICE_CODES.BEDROCK_ERROR, `Bedrock API error: ${message}`);
  },

  extractionServiceError(message: string): never {
    throwConvexError(SERVICE_CODES.EXTRACTION_SERVICE_ERROR, `Extraction service error: ${message}`);
  },

  storageError(message: string): never {
    throwConvexError(SERVICE_CODES.STORAGE_ERROR, `Storage error: ${message}`);
  },
} as const;
