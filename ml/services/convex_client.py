"""
Convex HTTP client for sending extraction results via webhook.

This module provides secure webhook delivery with:
- HMAC-SHA256 signature with timestamp binding
- Idempotency keys to prevent duplicate processing
- Exponential backoff retry on failures
- Structured logging for observability

Signature Format:
    The signature is computed over: "{timestamp}.{json_payload}"
    This binds the timestamp to the payload, preventing replay attacks.

Headers Sent:
    - X-Webhook-Signature: HMAC signature (v1={hex_digest})
    - X-Webhook-Timestamp: Unix timestamp when payload was signed
    - X-Idempotency-Key: Unique key to prevent duplicate processing

Verification (receiver side):
    1. Check timestamp is within acceptable window (e.g., 5 minutes)
    2. Reconstruct message: f"{timestamp}.{body}"
    3. Compute HMAC and compare with signature
    4. Use idempotency key to deduplicate
"""

import asyncio
import hmac
import hashlib
import json
import time
from typing import Any, Optional

import httpx
import structlog
from pydantic import BaseModel

from config import get_settings
from models import WebhookPayload, PDFWebhookPayload
from models.pdf_report import PDFGenerationProgress
from lib.errors import WebhookError

logger = structlog.get_logger()

# Retry configuration
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # Exponential backoff base (2^attempt seconds)
SIGNATURE_VERSION = "v1"


class ConvexClient:
    """
    Client for sending webhook notifications to Convex.

    Implements secure webhook delivery with HMAC signatures,
    retry logic, and structured error handling.
    """

    def __init__(self):
        settings = get_settings()
        self._convex_url = settings.convex_url
        self._webhook_secret = settings.convex_webhook_secret
        self._client = httpx.AsyncClient(timeout=30.0)

    def _sign_payload(self, payload_json: str, timestamp: int) -> str:
        """
        Sign the webhook payload using HMAC-SHA256 with timestamp binding.

        The signature covers both timestamp and payload to prevent:
        - Replay attacks (timestamp binding)
        - Payload tampering (HMAC integrity)

        Args:
            payload_json: JSON string payload
            timestamp: Unix timestamp for signature

        Returns:
            Signature in format "v1={hex_digest}"
        """
        # Bind timestamp to payload in signature
        message = f"{timestamp}.{payload_json}"

        signature = hmac.new(
            self._webhook_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return f"{SIGNATURE_VERSION}={signature}"

    def _generate_idempotency_key(self, job_id: str, timestamp: int) -> str:
        """
        Generate idempotency key for webhook delivery.

        Uses job_id combined with timestamp epoch (hourly bucket)
        to prevent duplicate processing while allowing retries
        within the same hour.

        Args:
            job_id: Unique job identifier
            timestamp: Unix timestamp

        Returns:
            Idempotency key string
        """
        # Bucket by hour to allow retries within same hour
        hour_bucket = timestamp // 3600
        return f"{job_id}:{hour_bucket}"

    async def _send_webhook_with_retry(
        self,
        webhook_url: str,
        payload_json: str,
        job_id: str,
        log_context: dict[str, Any],
        log_prefix: str = "webhook",
    ) -> bool:
        """
        Send a webhook with exponential backoff retry logic.

        Args:
            webhook_url: URL to send the webhook to
            payload_json: JSON string payload to send
            job_id: Job ID for idempotency key generation
            log_context: Context fields for logging
            log_prefix: Prefix for log events

        Returns:
            True if successful, False otherwise

        Raises:
            WebhookError: If all retry attempts exhausted
        """
        logger.info(f"sending_{log_prefix}", **log_context)

        last_error: Optional[Exception] = None

        for attempt in range(MAX_RETRIES):
            try:
                # Generate fresh timestamp and signature for each attempt
                timestamp = int(time.time())
                signature = self._sign_payload(payload_json, timestamp)
                idempotency_key = self._generate_idempotency_key(job_id, timestamp)

                response = await self._client.post(
                    webhook_url,
                    content=payload_json,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": signature,
                        "X-Webhook-Timestamp": str(timestamp),
                        "X-Idempotency-Key": idempotency_key,
                    },
                )

                if response.status_code == 200:
                    logger.info(
                        f"{log_prefix}_success",
                        **log_context,
                        attempt=attempt + 1,
                    )
                    return True

                # Retry on server errors (5xx)
                if response.status_code >= 500:
                    last_error = WebhookError(
                        message=f"Server error: {response.status_code}",
                        code="WEBHOOK_SERVER_ERROR",
                        details={
                            "status_code": response.status_code,
                            "response": response.text[:500],
                        },
                    )

                    if attempt < MAX_RETRIES - 1:
                        wait_time = RETRY_BACKOFF_BASE ** attempt
                        logger.warning(
                            f"{log_prefix}_retry",
                            **log_context,
                            status_code=response.status_code,
                            attempt=attempt + 1,
                            wait_seconds=wait_time,
                        )
                        await asyncio.sleep(wait_time)
                        continue

                # Non-retryable error (4xx)
                logger.error(
                    f"{log_prefix}_failed",
                    **log_context,
                    status_code=response.status_code,
                    response=response.text[:500],
                    attempt=attempt + 1,
                )

                raise WebhookError(
                    message=f"Webhook rejected: {response.status_code}",
                    code="WEBHOOK_REJECTED",
                    details={
                        "status_code": response.status_code,
                        "response": response.text[:500],
                    },
                )

            except httpx.TimeoutException as e:
                last_error = WebhookError(
                    message="Webhook request timed out",
                    code="WEBHOOK_TIMEOUT",
                    details={"timeout": "30s"},
                )

                if attempt < MAX_RETRIES - 1:
                    wait_time = RETRY_BACKOFF_BASE ** attempt
                    logger.warning(
                        f"{log_prefix}_timeout_retry",
                        **log_context,
                        error=str(e),
                        attempt=attempt + 1,
                        wait_seconds=wait_time,
                    )
                    await asyncio.sleep(wait_time)
                    continue

            except httpx.HTTPError as e:
                last_error = WebhookError(
                    message=f"Network error: {str(e)}",
                    code="WEBHOOK_NETWORK_ERROR",
                    details={"error": str(e)},
                )

                if attempt < MAX_RETRIES - 1:
                    wait_time = RETRY_BACKOFF_BASE ** attempt
                    logger.warning(
                        f"{log_prefix}_network_retry",
                        **log_context,
                        error=str(e),
                        attempt=attempt + 1,
                        wait_seconds=wait_time,
                    )
                    await asyncio.sleep(wait_time)
                    continue

        # All retries exhausted
        logger.error(
            f"{log_prefix}_all_retries_exhausted",
            **log_context,
            total_attempts=MAX_RETRIES,
        )

        if last_error:
            raise last_error

        raise WebhookError(
            message="All webhook retry attempts exhausted",
            code="WEBHOOK_DELIVERY_FAILED",
            details={"attempts": MAX_RETRIES},
        )

    async def send_extraction_results(self, payload: WebhookPayload) -> bool:
        """
        Send extraction results to Convex webhook with retry logic.

        Args:
            payload: Extraction results payload

        Returns:
            True if successful

        Raises:
            WebhookError: If delivery fails after retries
        """
        webhook_url = f"{self._convex_url}/api/extraction-results"
        payload_json = payload.model_dump_json()

        log_context = {
            "document_id": payload.document_id,
            "job_id": payload.job_id,
            "status": payload.status,
        }

        return await self._send_webhook_with_retry(
            webhook_url=webhook_url,
            payload_json=payload_json,
            job_id=payload.job_id,
            log_context=log_context,
            log_prefix="webhook",
        )

    async def send_pdf_results(
        self, payload: PDFWebhookPayload, webhook_url: str
    ) -> bool:
        """
        Send PDF generation results to Convex webhook with retry logic.

        Args:
            payload: PDF generation results payload
            webhook_url: URL to send results to

        Returns:
            True if successful

        Raises:
            WebhookError: If delivery fails after retries
        """
        payload_json = payload.model_dump_json()

        log_context = {
            "job_id": payload.job_id,
            "status": payload.status,
            "webhook_url": webhook_url,
        }

        return await self._send_webhook_with_retry(
            webhook_url=webhook_url,
            payload_json=payload_json,
            job_id=payload.job_id,
            log_context=log_context,
            log_prefix="pdf_webhook",
        )

    async def send_pdf_progress(
        self, progress: PDFGenerationProgress, webhook_url: str
    ) -> bool:
        """
        Send PDF generation progress update to Convex webhook.

        This method sends non-critical progress updates and does not
        use retries to avoid slowing down PDF generation. Failures
        are logged but not raised.

        Args:
            progress: Current progress state
            webhook_url: URL to send progress to

        Returns:
            True if successful, False otherwise
        """
        try:
            # Construct progress webhook URL (append /progress to base)
            progress_url = webhook_url.rstrip("/") + "/progress"

            timestamp = int(time.time())
            payload_json = progress.model_dump_json()
            signature = self._sign_payload(payload_json, timestamp)

            response = await self._client.post(
                progress_url,
                content=payload_json,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": signature,
                    "X-Webhook-Timestamp": str(timestamp),
                },
                timeout=5.0,  # Short timeout for progress updates
            )

            if response.status_code == 200:
                logger.debug(
                    "pdf_progress_sent",
                    job_id=progress.job_id,
                    progress=progress.progress,
                    step=progress.current_step,
                )
                return True

            # Don't retry - progress updates are not critical
            logger.warning(
                "pdf_progress_send_failed",
                job_id=progress.job_id,
                status_code=response.status_code,
            )
            return False

        except Exception as e:
            # Don't raise - progress updates are best-effort
            logger.debug(
                "pdf_progress_send_error",
                job_id=progress.job_id,
                error=str(e),
            )
            return False

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()
