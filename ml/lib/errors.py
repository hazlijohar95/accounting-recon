"""
Typed Exception Classes for Reconciled ML Service.

This module provides structured exception types that replace bare Exception
handling throughout the codebase. Each exception includes:
- message: Human-readable error description
- code: Machine-readable error code for API responses
- details: Optional dictionary with contextual information

Usage:
    try:
        await storage.download_file(url)
    except StorageError as e:
        logger.error("storage_failed", code=e.code, details=e.details)
        # Handle storage-specific error

Exception Hierarchy:
    ExtractionError (base)
    ├── StorageError   - R2 storage operations
    ├── OCRError       - OCR/LLM text extraction
    ├── WebhookError   - Webhook delivery failures
    ├── RateLimitError - Rate limit exceeded
    └── ValidationError - Input validation errors
"""

from typing import Optional


class ExtractionError(Exception):
    """
    Base exception for extraction pipeline errors.

    All domain-specific exceptions inherit from this class,
    allowing catch-all handling when needed while enabling
    specific exception handling for granular control.

    Attributes:
        message: Human-readable error description
        code: Machine-readable error code (e.g., "STORAGE_TIMEOUT")
        details: Optional dictionary with additional context
    """

    def __init__(
        self,
        message: str,
        code: str,
        details: Optional[dict] = None,
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"

    def to_dict(self) -> dict:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.message,
            "code": self.code,
            "details": self.details,
        }


class StorageError(ExtractionError):
    """
    R2 storage operation failures.

    Raised when:
    - File download fails (timeout, not found, permission denied)
    - File upload fails
    - Presigned URL generation fails

    Common codes:
    - STORAGE_DOWNLOAD_FAILED: Failed to download file from R2
    - STORAGE_UPLOAD_FAILED: Failed to upload file to R2
    - STORAGE_TIMEOUT: R2 operation timed out
    - STORAGE_NOT_FOUND: File not found in storage
    - STORAGE_PERMISSION_DENIED: Access denied to storage resource
    """

    def __init__(
        self,
        message: str,
        code: str = "STORAGE_ERROR",
        details: Optional[dict] = None,
    ):
        super().__init__(message, code, details)


class OCRError(ExtractionError):
    """
    OCR/LLM text extraction failures.

    Raised when:
    - Mistral API call fails
    - Rate limit exceeded on OCR API
    - OCR returns invalid/empty response
    - Document is corrupted or unreadable

    Common codes:
    - OCR_API_ERROR: Mistral API returned an error
    - OCR_RATE_LIMITED: Rate limit exceeded on OCR API
    - OCR_TIMEOUT: OCR operation timed out
    - OCR_INVALID_RESPONSE: OCR returned invalid data
    - OCR_CORRUPTED_FILE: Document file is corrupted
    """

    def __init__(
        self,
        message: str,
        code: str = "OCR_ERROR",
        details: Optional[dict] = None,
    ):
        super().__init__(message, code, details)


class WebhookError(ExtractionError):
    """
    Webhook delivery failures.

    Raised when:
    - Webhook URL is unreachable
    - Webhook returns non-200 response after retries
    - Webhook payload is rejected

    Common codes:
    - WEBHOOK_DELIVERY_FAILED: All retry attempts exhausted
    - WEBHOOK_TIMEOUT: Webhook endpoint did not respond in time
    - WEBHOOK_REJECTED: Webhook endpoint rejected the payload
    """

    def __init__(
        self,
        message: str,
        code: str = "WEBHOOK_ERROR",
        details: Optional[dict] = None,
    ):
        super().__init__(message, code, details)


class RateLimitError(ExtractionError):
    """
    Rate limit exceeded.

    Raised when per-user or per-company rate limits are exceeded.
    Includes retry_after hint when available.

    Common codes:
    - RATE_LIMIT_EXCEEDED: Request rate limit exceeded
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        code: str = "RATE_LIMIT_EXCEEDED",
        details: Optional[dict] = None,
        retry_after: Optional[int] = None,
    ):
        details = details or {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(message, code, details)
        self.retry_after = retry_after


class ValidationError(ExtractionError):
    """
    Input validation failures.

    Raised when:
    - Invalid file type
    - File exceeds size limit
    - Missing required fields
    - Invalid document format

    Common codes:
    - VALIDATION_INVALID_FILE_TYPE: Unsupported file type
    - VALIDATION_FILE_TOO_LARGE: File exceeds size limit
    - VALIDATION_MISSING_FIELD: Required field missing
    - VALIDATION_INVALID_FORMAT: Invalid document format
    """

    def __init__(
        self,
        message: str,
        code: str = "VALIDATION_ERROR",
        details: Optional[dict] = None,
    ):
        super().__init__(message, code, details)
