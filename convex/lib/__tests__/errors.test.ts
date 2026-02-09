import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  AuthErrors,
  BusinessErrors,
  PermissionErrors,
  ResourceErrors,
  ServiceErrors,
  ValidationErrors,
  AUTH_CODES,
  BUSINESS_CODES,
  PERMISSION_CODES,
  RESOURCE_CODES,
  SERVICE_CODES,
  VALIDATION_CODES,
} from "../errors";

type ErrorData = {
  code?: string;
  message?: string;
  field?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
};

function captureError(fn: () => void): ErrorData {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    return (error as ConvexError<any>).data as ErrorData;
  }
  throw new Error("Expected ConvexError to be thrown");
}

describe("Convex error helpers", () => {
  it("throws auth errors with correct payload", () => {
    const data = captureError(() => AuthErrors.unauthorized());
    expect(data.code).toBe(AUTH_CODES.UNAUTHORIZED);
    expect(data.message).toBe("Please sign in to continue");

    const session = captureError(() => AuthErrors.sessionExpired());
    expect(session.code).toBe(AUTH_CODES.SESSION_EXPIRED);
    expect(session.message).toContain("session has expired");
  });

  it("throws resource errors with metadata", () => {
    const data = captureError(() => ResourceErrors.notFound("Company", "c1"));
    expect(data.code).toBe(RESOURCE_CODES.NOT_FOUND);
    expect(data.resourceType).toBe("Company");
    expect(data.resourceId).toBe("c1");

    const invalidState = captureError(() =>
      ResourceErrors.invalidState("Session", "open", "closed")
    );
    expect(invalidState.code).toBe(RESOURCE_CODES.INVALID_STATE);
    expect(invalidState.details).toEqual({ currentState: "open", expectedState: "closed" });
  });

  it("throws permission errors with expected codes", () => {
    const data = captureError(() => PermissionErrors.accessDenied("document"));
    expect(data.code).toBe(PERMISSION_CODES.ACCESS_DENIED);
    expect(data.message).toContain("document");

    const rateLimited = captureError(() => PermissionErrors.rateLimited());
    expect(rateLimited.code).toBe(PERMISSION_CODES.RATE_LIMITED);
  });

  it("throws validation errors with details", () => {
    const invalidType = captureError(() => ValidationErrors.invalidType("amount", "number"));
    expect(invalidType.code).toBe(VALIDATION_CODES.INVALID_TYPE);
    expect(invalidType.details).toEqual({ expectedType: "number" });

    const outOfRange = captureError(() => ValidationErrors.outOfRange("age", 18, 65));
    expect(outOfRange.code).toBe(VALIDATION_CODES.OUT_OF_RANGE);
    expect(outOfRange.details).toEqual({ min: 18, max: 65 });
  });

  it("throws business and service errors", () => {
    const mismatch = captureError(() => BusinessErrors.sessionMismatch("Transaction"));
    expect(mismatch.code).toBe(BUSINESS_CODES.SESSION_MISMATCH);
    expect(mismatch.resourceType).toBe("Transaction");

    const service = captureError(() => ServiceErrors.storageError("S3 unavailable"));
    expect(service.code).toBe(SERVICE_CODES.STORAGE_ERROR);
    expect(service.message).toContain("Storage error");
  });
});
