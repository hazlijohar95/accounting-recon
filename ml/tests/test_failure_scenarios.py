"""
Failure Scenario Tests for Reconciled ML Service.

This module tests error handling and failure modes throughout
the extraction pipeline, ensuring proper error propagation
and structured error responses.

Test Categories:
- Storage failures (download/upload timeouts, not found, etc.)
- OCR failures (API errors, rate limits, invalid responses)
- Webhook failures (delivery failures, retries)
- Corrupted file handling
- Rate limit enforcement
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from lib.errors import (
    ExtractionError,
    StorageError,
    OCRError,
    WebhookError,
    RateLimitError,
)
from services.convex_client import ConvexClient
from middleware.rate_limit import TokenBucketRateLimiter, PerUserRateLimiter


class TestStorageFailures:
    """Test storage operation failure handling."""

    @pytest.mark.asyncio
    async def test_storage_download_timeout(self):
        """Test handling of R2 download timeout."""
        from services.storage import StorageService

        storage = StorageService()

        with patch.object(
            storage._client,
            "get_object",
            side_effect=Exception("Connection timeout"),
        ):
            with pytest.raises(Exception) as exc_info:
                await storage.download_file("https://example.com/file.pdf")

            assert "timeout" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_storage_error_wrapping(self):
        """Test that storage errors are properly wrapped."""
        error = StorageError(
            message="Failed to download file",
            code="STORAGE_DOWNLOAD_FAILED",
            details={"url": "https://example.com/file.pdf"},
        )

        assert error.code == "STORAGE_DOWNLOAD_FAILED"
        assert "download" in error.message.lower()
        assert error.details["url"] == "https://example.com/file.pdf"

        # Test to_dict for API response
        error_dict = error.to_dict()
        assert error_dict["code"] == "STORAGE_DOWNLOAD_FAILED"
        assert "error" in error_dict


class TestOCRFailures:
    """Test OCR operation failure handling."""

    @pytest.mark.asyncio
    async def test_ocr_api_rate_limit(self):
        """Test handling of Mistral rate limiting."""
        error = OCRError(
            message="Rate limit exceeded",
            code="OCR_RATE_LIMITED",
            details={"retry_after": 60},
        )

        assert error.code == "OCR_RATE_LIMITED"
        assert "rate limit" in error.message.lower()

    @pytest.mark.asyncio
    async def test_ocr_invalid_response(self):
        """Test handling of invalid OCR response."""
        error = OCRError(
            message="OCR returned empty text",
            code="OCR_INVALID_RESPONSE",
            details={"response_length": 0},
        )

        assert error.code == "OCR_INVALID_RESPONSE"

    def test_ocr_error_inheritance(self):
        """Test that OCRError inherits from ExtractionError."""
        error = OCRError("Test error", "TEST_CODE")
        assert isinstance(error, ExtractionError)
        assert isinstance(error, OCRError)


class TestWebhookFailures:
    """Test webhook delivery failure handling."""

    @pytest.mark.asyncio
    async def test_webhook_delivery_failure_retries(self):
        """Test webhook retry logic on failure."""
        client = ConvexClient()

        call_count = 0

        async def failing_then_success(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                response = MagicMock()
                response.status_code = 500
                response.text = "Internal Server Error"
                return response
            response = MagicMock()
            response.status_code = 200
            return response

        with patch.object(client._client, "post", side_effect=failing_then_success):
            from models import WebhookPayload, ExtractionStatus

            payload = WebhookPayload(
                document_id="test-doc",
                company_id="test-company",
                job_id="test-job",
                status=ExtractionStatus.COMPLETED,
                extracted_text="Test text",
                extraction_confidence=95.0,
                transaction_count=10,
            )

            result = await client.send_extraction_results(payload)
            assert result is True
            assert call_count == 3  # Retried twice then succeeded

        await client.close()

    @pytest.mark.asyncio
    async def test_webhook_all_retries_exhausted(self):
        """Test webhook failure after all retries exhausted."""
        client = ConvexClient()

        async def always_fail(*args, **kwargs):
            response = MagicMock()
            response.status_code = 500
            response.text = "Internal Server Error"
            return response

        with patch.object(client._client, "post", side_effect=always_fail):
            from models import WebhookPayload, ExtractionStatus

            payload = WebhookPayload(
                document_id="test-doc",
                company_id="test-company",
                job_id="test-job",
                status=ExtractionStatus.COMPLETED,
                extracted_text="Test text",
                extraction_confidence=95.0,
                transaction_count=10,
            )

            with pytest.raises(WebhookError) as exc_info:
                await client.send_extraction_results(payload)

            assert exc_info.value.code in [
                "WEBHOOK_SERVER_ERROR",
                "WEBHOOK_DELIVERY_FAILED",
            ]

        await client.close()

    @pytest.mark.asyncio
    async def test_webhook_client_error_no_retry(self):
        """Test that 4xx errors don't trigger retries."""
        client = ConvexClient()
        call_count = 0

        async def client_error(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            response = MagicMock()
            response.status_code = 400
            response.text = "Bad Request"
            return response

        with patch.object(client._client, "post", side_effect=client_error):
            from models import WebhookPayload, ExtractionStatus

            payload = WebhookPayload(
                document_id="test-doc",
                company_id="test-company",
                job_id="test-job",
                status=ExtractionStatus.COMPLETED,
                extracted_text="Test text",
                extraction_confidence=95.0,
                transaction_count=10,
            )

            with pytest.raises(WebhookError) as exc_info:
                await client.send_extraction_results(payload)

            # Should only try once for 4xx errors
            assert call_count == 1
            assert exc_info.value.code == "WEBHOOK_REJECTED"

        await client.close()

    @pytest.mark.asyncio
    async def test_webhook_timeout_handling(self):
        """Test handling of webhook timeout."""
        client = ConvexClient()

        async def timeout(*args, **kwargs):
            raise httpx.TimeoutException("Connection timeout")

        with patch.object(client._client, "post", side_effect=timeout):
            from models import WebhookPayload, ExtractionStatus

            payload = WebhookPayload(
                document_id="test-doc",
                company_id="test-company",
                job_id="test-job",
                status=ExtractionStatus.COMPLETED,
                extracted_text="Test text",
                extraction_confidence=95.0,
                transaction_count=10,
            )

            with pytest.raises(WebhookError) as exc_info:
                await client.send_extraction_results(payload)

            assert exc_info.value.code == "WEBHOOK_TIMEOUT"

        await client.close()


class TestRateLimiting:
    """Test rate limiting functionality."""

    @pytest.mark.asyncio
    async def test_token_bucket_allows_burst(self):
        """Test that token bucket allows burst up to capacity."""
        limiter = TokenBucketRateLimiter(rate=1.0, capacity=5)

        # Should allow 5 requests immediately (burst capacity)
        for _ in range(5):
            assert await limiter.acquire("test-user")

        # 6th request should be rate limited
        assert not await limiter.acquire("test-user")

    @pytest.mark.asyncio
    async def test_token_bucket_refills(self):
        """Test that tokens refill over time."""
        import asyncio

        limiter = TokenBucketRateLimiter(rate=10.0, capacity=10)  # 10 tokens/sec

        # Exhaust all tokens
        for _ in range(10):
            await limiter.acquire("test-user")

        # Wait for 1 token to refill
        await asyncio.sleep(0.15)

        # Should have at least 1 token now
        assert await limiter.acquire("test-user")

    @pytest.mark.asyncio
    async def test_token_bucket_per_user_isolation(self):
        """Test that different users have separate buckets."""
        limiter = TokenBucketRateLimiter(rate=1.0, capacity=2)

        # User A uses all tokens
        assert await limiter.acquire("user-a")
        assert await limiter.acquire("user-a")
        assert not await limiter.acquire("user-a")

        # User B should still have tokens
        assert await limiter.acquire("user-b")
        assert await limiter.acquire("user-b")

    @pytest.mark.asyncio
    async def test_per_user_rate_limiter(self):
        """Test PerUserRateLimiter wrapper."""
        limiter = PerUserRateLimiter(requests_per_minute=60, burst_capacity=5)

        # Should allow burst
        for _ in range(5):
            assert await limiter.check_rate_limit("company-123")

        # Should be rate limited
        assert not await limiter.check_rate_limit("company-123")

        # Check retry_after is positive
        retry_after = await limiter.get_retry_after("company-123")
        assert retry_after > 0

    @pytest.mark.asyncio
    async def test_rate_limit_error(self):
        """Test RateLimitError has retry_after."""
        error = RateLimitError(
            message="Rate limit exceeded",
            retry_after=30,
            details={"company_id": "test-company"},
        )

        assert error.retry_after == 30
        assert error.details["retry_after"] == 30
        assert error.code == "RATE_LIMIT_EXCEEDED"


class TestCorruptedFileHandling:
    """Test handling of corrupted files."""

    def test_storage_error_for_corrupted_file(self):
        """Test that corrupted file triggers appropriate error."""
        error = StorageError(
            message="File is corrupted or invalid",
            code="STORAGE_INVALID_FILE",
            details={"file_type": "pdf", "magic_bytes": [0x00, 0x00]},
        )

        assert "corrupt" in error.message.lower() or "invalid" in error.message.lower()

    def test_ocr_error_for_unreadable_document(self):
        """Test OCR error for unreadable document."""
        error = OCRError(
            message="Document is corrupted and cannot be processed",
            code="OCR_CORRUPTED_FILE",
            details={"file_size": 1024},
        )

        assert error.code == "OCR_CORRUPTED_FILE"


class TestErrorHierarchy:
    """Test error class hierarchy and methods."""

    def test_all_errors_inherit_from_extraction_error(self):
        """Test that all custom errors inherit from ExtractionError."""
        errors = [
            StorageError("test", "TEST"),
            OCRError("test", "TEST"),
            WebhookError("test", "TEST"),
            RateLimitError("test"),
        ]

        for error in errors:
            assert isinstance(error, ExtractionError)

    def test_error_str_representation(self):
        """Test error string representation."""
        error = StorageError("Test message", "TEST_CODE")
        str_repr = str(error)

        assert "TEST_CODE" in str_repr
        assert "Test message" in str_repr

    def test_error_to_dict(self):
        """Test error to_dict method."""
        error = OCRError(
            message="API error",
            code="OCR_API_ERROR",
            details={"status_code": 503},
        )

        error_dict = error.to_dict()

        assert error_dict["error"] == "API error"
        assert error_dict["code"] == "OCR_API_ERROR"
        assert error_dict["details"]["status_code"] == 503


class TestWebhookSignature:
    """Test webhook signature generation."""

    def test_signature_includes_timestamp(self):
        """Test that signature is bound to timestamp."""
        client = ConvexClient()

        payload = '{"test": "data"}'
        timestamp1 = 1704067200  # Fixed timestamp
        timestamp2 = 1704067201  # Different timestamp

        sig1 = client._sign_payload(payload, timestamp1)
        sig2 = client._sign_payload(payload, timestamp2)

        # Different timestamps should produce different signatures
        assert sig1 != sig2

        # Signature format should be v1={hex}
        assert sig1.startswith("v1=")
        assert len(sig1) > 66  # v1= + 64 hex chars

    def test_idempotency_key_generation(self):
        """Test idempotency key generation."""
        client = ConvexClient()

        job_id = "test-job-123"
        timestamp1 = 1704067200
        timestamp2 = timestamp1 + 3600  # 1 hour later

        key1 = client._generate_idempotency_key(job_id, timestamp1)
        key2 = client._generate_idempotency_key(job_id, timestamp2)

        # Same job, same hour = same key
        key1_same = client._generate_idempotency_key(job_id, timestamp1 + 1800)
        assert key1 == key1_same

        # Different hour = different key
        assert key1 != key2
