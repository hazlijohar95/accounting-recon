import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  validateAmount,
  validateBulkSize,
  validateCurrency,
  validateDate,
  validateNonEmpty,
  validateNonEmptyArray,
  validateOptionalAmount,
  validateOptionalDate,
  filterUndefinedValues,
} from "../validation";
import { VALIDATION_CODES } from "../errors";

type ErrorData = { code?: string; message?: string; field?: string };

function getError(fn: () => void): ErrorData {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    return (error as ConvexError<any>).data as ErrorData;
  }
  throw new Error("Expected ConvexError to be thrown");
}

describe("validation helpers", () => {
  it("validates amounts", () => {
    expect(() => validateAmount(10)).not.toThrow();
    const data = getError(() => validateAmount(Number.NaN, "amount"));
    expect(data.code).toBe(VALIDATION_CODES.INVALID_TYPE);
    expect(data.field).toBe("amount");
  });

  it("validates dates", () => {
    expect(() => validateDate("2024-01-31", "date")).not.toThrow();
    const formatError = getError(() => validateDate("2024/01/31", "date"));
    expect(formatError.code).toBe(VALIDATION_CODES.INVALID_FORMAT);

    const invalidDate = getError(() => validateDate("2024-13-01", "date"));
    expect(invalidDate.code).toBe(VALIDATION_CODES.INVALID_FORMAT);
  });

  it("validates currency, strings, and arrays", () => {
    expect(() => validateCurrency("usd")).not.toThrow();
    const currencyError = getError(() => validateCurrency("US"));
    expect(currencyError.code).toBe(VALIDATION_CODES.INVALID_FORMAT);

    const emptyError = getError(() => validateNonEmpty(" ", "name"));
    expect(emptyError.code).toBe(VALIDATION_CODES.INVALID_INPUT);

    const arrayError = getError(() => validateNonEmptyArray([], "items"));
    expect(arrayError.code).toBe(VALIDATION_CODES.INVALID_INPUT);
  });

  it("handles optional validations", () => {
    expect(() => validateOptionalDate(undefined, "date")).not.toThrow();
    expect(() => validateOptionalAmount(undefined, "amount")).not.toThrow();
  });

  it("filters undefined values from objects", () => {
    const filtered = filterUndefinedValues({ a: 1, b: undefined, c: "x" });
    expect(filtered).toEqual({ a: 1, c: "x" });
  });

  it("validates bulk size limits", () => {
    expect(() => validateBulkSize(10, 20)).not.toThrow();
    const bulkError = getError(() => validateBulkSize(5, 2));
    expect(bulkError.code).toBe(VALIDATION_CODES.BULK_LIMIT_EXCEEDED);
  });
});
