"""
Reconciled ML Service - FastAPI Application.

This module provides the FastAPI application for document extraction and
PDF generation services. It serves as the API gateway for the ML service,
handling document uploads, extraction processing, and report generation.

API Endpoints:
    - GET /health: Health check endpoint
    - GET /: Service info and available endpoints
    - POST /extract: Start document extraction job (rate limited: 30/min)
    - POST /generate-pdf: Start PDF generation job (rate limited: 10/min)

Architecture:
    - Dependency injection for services (testable, no global state)
    - Background task processing for async extraction
    - Webhook notifications to Convex on completion
    - Cloudflare R2 storage for file handling
    - Structured logging with JSON output

Security:
    - IP-based rate limiting via slowapi
    - Per-user/company rate limiting via token bucket
    - CORS restricted to production domains
    - Environment-based debug mode
    - HTTPS enforcement for Convex URLs
    - Typed error handling (no bare exceptions)

Example:
    Run development server:
    >>> uvicorn main:app --reload --port 8000

    Or directly:
    >>> python main.py
"""

import asyncio
import uuid
from contextlib import asynccontextmanager

import httpx
import structlog
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import get_settings
from models import (
    ExtractionRequest,
    ExtractionResponse,
    ExtractionStatus,
    WebhookPayload,
    PDFGenerationRequest,
    PDFGenerationResponse,
    PDFGenerationProgress,
    PDFStatus,
    PDFWebhookPayload,
    EnrichRequest,
    EnrichResponse,
    BatchEnrichRequest,
    BatchEnrichResponse,
    AgentStatus,
    AgentWebhookPayload,
)
from services import (
    StorageService,
    OCRService,
    ConvexClient,
    BankExtractionService,
    InvoiceExtractionService,
    PDFGeneratorService,
    get_agent_service,
    shutdown_agent_service,
)
from dependencies import (
    get_storage_service,
    get_ocr_service,
    get_convex_client,
    get_bank_extraction_service,
    get_invoice_extraction_service,
    get_pdf_generator_service,
    get_user_rate_limiter,
    get_pdf_rate_limiter,
    shutdown_services,
)
from middleware import PerUserRateLimiter
from lib.errors import (
    ExtractionError,
    StorageError,
    OCRError,
    WebhookError,
    RateLimitError,
)

# Initialize rate limiter (IP-based, in addition to per-user)
limiter = Limiter(key_func=get_remote_address)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for service initialization and cleanup.

    Uses dependency injection - services are lazily initialized on first use.
    Cleanup happens on shutdown via shutdown_services().
    """
    logger.info("starting_ml_service")
    yield
    logger.info("shutting_down_ml_service")
    await shutdown_services()
    await shutdown_agent_service()


app = FastAPI(
    title="Reconciled ML Service",
    description="Document extraction service for accounting reconciliation",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiter to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - SECURITY: Restrict origins in production
settings = get_settings()
CORS_ORIGINS = [
    "https://reconciled.dev",
    "https://www.reconciled.dev",
]

if settings.debug:
    CORS_ORIGINS.append("http://localhost:3000")
    CORS_ORIGINS.append("http://127.0.0.1:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)


# ============================================================================
# Exception Handlers
# ============================================================================


@app.exception_handler(ExtractionError)
async def extraction_error_handler(request: Request, exc: ExtractionError):
    """Handle typed extraction errors with structured response."""
    logger.error(
        "extraction_error",
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )
    return JSONResponse(
        status_code=500,
        content=exc.to_dict(),
    )


@app.exception_handler(RateLimitError)
async def rate_limit_error_handler(request: Request, exc: RateLimitError):
    """Handle rate limit errors with retry-after header."""
    headers = {}
    if exc.retry_after:
        headers["Retry-After"] = str(exc.retry_after)

    return JSONResponse(
        status_code=429,
        content=exc.to_dict(),
        headers=headers,
    )


# ============================================================================
# Health & Info Endpoints
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "reconciled-ml"}


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "Reconciled ML Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "extract": "/extract",
            "status": "/extract/{job_id}",
            "generate_pdf": "/generate-pdf",
            "agent_enrich": "/agent/enrich",
            "agent_batch": "/agent/batch",
        },
    }


# ============================================================================
# Extraction Endpoints
# ============================================================================


@app.post("/extract", response_model=ExtractionResponse)
@limiter.limit("30/minute")
async def start_extraction(
    request: Request,
    extraction_request: ExtractionRequest,
    background_tasks: BackgroundTasks,
    user_limiter: PerUserRateLimiter = Depends(get_user_rate_limiter),
    storage: StorageService = Depends(get_storage_service),
    ocr: OCRService = Depends(get_ocr_service),
    convex: ConvexClient = Depends(get_convex_client),
):
    """
    Start document extraction job.

    Rate limited by both IP (30/min) and per-company (30/min).
    Results are sent to Convex webhook when complete.
    """
    # Per-user rate limiting
    if not await user_limiter.check_rate_limit(extraction_request.company_id):
        retry_after = await user_limiter.get_retry_after(extraction_request.company_id)
        raise RateLimitError(
            message="Rate limit exceeded for this company",
            retry_after=retry_after,
            details={"company_id": extraction_request.company_id},
        )

    job_id = str(uuid.uuid4())

    logger.info(
        "extraction_requested",
        job_id=job_id,
        document_id=extraction_request.document_id,
        document_type=extraction_request.document_type,
        company_id=extraction_request.company_id,
    )

    # Queue the extraction task with injected services
    background_tasks.add_task(
        process_extraction,
        job_id=job_id,
        request=extraction_request,
        storage=storage,
        ocr=ocr,
        convex=convex,
    )

    return ExtractionResponse(
        job_id=job_id,
        status=ExtractionStatus.PROCESSING,
        message="Extraction started",
    )


async def process_extraction(
    job_id: str,
    request: ExtractionRequest,
    storage: StorageService,
    ocr: OCRService,
    convex: ConvexClient,
):
    """
    Background task to process document extraction.

    Uses dependency-injected services for testability.
    Handles typed exceptions with specific error messages.

    Args:
        job_id: Unique identifier for tracking this extraction job
        request: Extraction request with document ID, type, and storage URL
        storage: Injected storage service
        ocr: Injected OCR service
        convex: Injected Convex client
    """
    logger.info(
        "processing_extraction",
        job_id=job_id,
        document_id=request.document_id,
    )

    payload: WebhookPayload

    try:
        # Download file from R2
        try:
            file_content = await storage.download_file(request.storage_url)
        except Exception as e:
            raise StorageError(
                message=f"Failed to download file: {str(e)}",
                code="STORAGE_DOWNLOAD_FAILED",
                details={"storage_url": request.storage_url[:100]},
            ) from e

        logger.info(
            "file_downloaded",
            job_id=job_id,
            size=len(file_content),
        )

        # Create extraction service with injected OCR
        bank_service = BankExtractionService(ocr)
        invoice_service = InvoiceExtractionService(ocr)

        # Extract based on document type
        if request.document_type == "bank_statement":
            try:
                result = await bank_service.extract(
                    file_content,
                    request.file_type,
                )
            except Exception as e:
                raise OCRError(
                    message=f"Bank statement extraction failed: {str(e)}",
                    code="OCR_BANK_EXTRACTION_FAILED",
                    details={"file_type": request.file_type},
                ) from e

            payload = WebhookPayload(
                document_id=request.document_id,
                company_id=request.company_id,
                job_id=job_id,
                status=ExtractionStatus.COMPLETED,
                bank_statement=result,
                extracted_text=result.raw_text,
                extraction_confidence=result.overall_confidence * 100,
                transaction_count=len(result.transactions),
            )

        elif request.document_type in ("invoice", "receipt"):
            try:
                result = await invoice_service.extract(
                    file_content,
                    request.file_type,
                    expected_type=request.document_type,
                )
            except Exception as e:
                raise OCRError(
                    message=f"Invoice extraction failed: {str(e)}",
                    code="OCR_INVOICE_EXTRACTION_FAILED",
                    details={"file_type": request.file_type},
                ) from e

            payload = WebhookPayload(
                document_id=request.document_id,
                company_id=request.company_id,
                job_id=job_id,
                status=ExtractionStatus.COMPLETED,
                invoice=result,
                extracted_text=result.raw_text,
                extraction_confidence=result.overall_confidence * 100,
                transaction_count=len(result.line_items) if result.line_items else 1,
            )

        else:
            # Unknown document type - just OCR
            try:
                raw_text = await ocr.extract_text(
                    file_content,
                    request.file_type,
                )
            except Exception as e:
                raise OCRError(
                    message=f"OCR extraction failed: {str(e)}",
                    code="OCR_TEXT_EXTRACTION_FAILED",
                    details={"file_type": request.file_type},
                ) from e

            payload = WebhookPayload(
                document_id=request.document_id,
                company_id=request.company_id,
                job_id=job_id,
                status=ExtractionStatus.COMPLETED,
                extracted_text=raw_text,
                extraction_confidence=50.0,
                transaction_count=0,
            )

        logger.info(
            "extraction_complete",
            job_id=job_id,
            document_id=request.document_id,
            confidence=payload.extraction_confidence,
        )

        # Send results to Convex
        try:
            await convex.send_extraction_results(payload)
        except WebhookError as e:
            # Log webhook failure but don't propagate - extraction succeeded
            logger.error(
                "webhook_delivery_failed",
                job_id=job_id,
                document_id=request.document_id,
                code=e.code,
                error=e.message,
            )

    except StorageError as e:
        logger.error(
            "extraction_storage_error",
            job_id=job_id,
            document_id=request.document_id,
            code=e.code,
            error=e.message,
            details=e.details,
        )
        payload = WebhookPayload(
            document_id=request.document_id,
            company_id=request.company_id,
            job_id=job_id,
            status=ExtractionStatus.FAILED,
            error_message=f"Storage error: {e.message}",
        )
        await _send_failure_webhook(convex, payload)

    except OCRError as e:
        logger.error(
            "extraction_ocr_error",
            job_id=job_id,
            document_id=request.document_id,
            code=e.code,
            error=e.message,
            details=e.details,
        )
        payload = WebhookPayload(
            document_id=request.document_id,
            company_id=request.company_id,
            job_id=job_id,
            status=ExtractionStatus.FAILED,
            error_message=f"OCR error: {e.message}",
        )
        await _send_failure_webhook(convex, payload)

    except ExtractionError as e:
        logger.error(
            "extraction_error",
            job_id=job_id,
            document_id=request.document_id,
            code=e.code,
            error=e.message,
            details=e.details,
        )
        payload = WebhookPayload(
            document_id=request.document_id,
            company_id=request.company_id,
            job_id=job_id,
            status=ExtractionStatus.FAILED,
            error_message=e.message,
        )
        await _send_failure_webhook(convex, payload)

    except Exception as e:
        # Unexpected error - log full traceback
        logger.exception(
            "extraction_unexpected_error",
            job_id=job_id,
            document_id=request.document_id,
            error=str(e),
        )
        payload = WebhookPayload(
            document_id=request.document_id,
            company_id=request.company_id,
            job_id=job_id,
            status=ExtractionStatus.FAILED,
            error_message="Internal processing error",
        )
        await _send_failure_webhook(convex, payload)


async def _send_failure_webhook(convex: ConvexClient, payload: WebhookPayload):
    """Send failure notification to Convex, ignoring webhook errors."""
    try:
        await convex.send_extraction_results(payload)
    except WebhookError as e:
        logger.error(
            "failure_webhook_delivery_failed",
            job_id=payload.job_id,
            document_id=payload.document_id,
            code=e.code,
        )


# ============================================================================
# PDF Generation Endpoints
# ============================================================================


@app.post("/generate-pdf", response_model=PDFGenerationResponse)
@limiter.limit("10/minute")
async def start_pdf_generation(
    request: Request,
    pdf_request: PDFGenerationRequest,
    background_tasks: BackgroundTasks,
    pdf_limiter: PerUserRateLimiter = Depends(get_pdf_rate_limiter),
    storage: StorageService = Depends(get_storage_service),
    pdf_generator: PDFGeneratorService = Depends(get_pdf_generator_service),
    convex: ConvexClient = Depends(get_convex_client),
):
    """
    Start PDF report generation job.

    Rate limited by both IP (10/min) and per-company (10/min).
    Results are sent to Convex webhook when complete.
    """
    # Extract company ID from request for rate limiting
    company_id = pdf_request.company.id if pdf_request.company else "unknown"

    if not await pdf_limiter.check_rate_limit(company_id):
        retry_after = await pdf_limiter.get_retry_after(company_id)
        raise RateLimitError(
            message="PDF generation rate limit exceeded",
            retry_after=retry_after,
            details={"company_id": company_id},
        )

    logger.info(
        "pdf_generation_requested",
        job_id=pdf_request.job_id,
        report_type=pdf_request.report_type,
        company=pdf_request.company.name,
    )

    background_tasks.add_task(
        process_pdf_generation,
        request=pdf_request,
        storage=storage,
        pdf_generator=pdf_generator,
        convex=convex,
    )

    return PDFGenerationResponse(
        job_id=pdf_request.job_id,
        status=PDFStatus.PROCESSING,
        message="PDF generation started",
    )


async def process_pdf_generation(
    request: PDFGenerationRequest,
    storage: StorageService,
    pdf_generator: PDFGeneratorService,
    convex: ConvexClient,
):
    """
    Background task to generate PDF report with progress tracking.

    Uses dependency-injected services for testability. Reports progress
    updates via webhook to enable real-time progress display in the UI.

    Args:
        request: PDF generation request with report type, data, and options
        storage: Injected storage service
        pdf_generator: Injected PDF generator service
        convex: Injected Convex client
    """
    logger.info(
        "processing_pdf_generation",
        job_id=request.job_id,
        report_type=request.report_type,
    )

    payload: PDFWebhookPayload

    # Progress callback for async PDF generation
    async def progress_callback(progress: PDFGenerationProgress) -> None:
        """Send progress updates to Convex webhook."""
        await convex.send_pdf_progress(progress, request.webhook_url)

    try:
        # Generate PDF with progress tracking
        try:
            pdf_content = await pdf_generator.generate_report_async(
                request, progress_callback
            )
        except Exception as e:
            raise ExtractionError(
                message=f"PDF generation failed: {str(e)}",
                code="PDF_GENERATION_FAILED",
                details={"report_type": request.report_type},
            ) from e

        # Generate file name
        file_name = pdf_generator.generate_file_name(
            request.report_type,
            request.data.session.name,
        )

        # Upload to R2
        storage_id = f"exports/pdf/{request.job_id}/{file_name}"
        try:
            download_url = await asyncio.to_thread(
                storage.upload_file,
                pdf_content,
                storage_id,
                "application/pdf",
            )
        except Exception as e:
            raise StorageError(
                message=f"Failed to upload PDF: {str(e)}",
                code="STORAGE_UPLOAD_FAILED",
                details={"storage_id": storage_id},
            ) from e

        logger.info(
            "pdf_generation_complete",
            job_id=request.job_id,
            file_name=file_name,
            size_bytes=len(pdf_content),
        )

        payload = PDFWebhookPayload(
            job_id=request.job_id,
            status=PDFStatus.COMPLETED,
            download_url=download_url,
            file_name=file_name,
        )

        try:
            await convex.send_pdf_results(payload, request.webhook_url)
        except WebhookError as e:
            logger.error(
                "pdf_webhook_delivery_failed",
                job_id=request.job_id,
                code=e.code,
                error=e.message,
            )

    except StorageError as e:
        logger.error(
            "pdf_storage_error",
            job_id=request.job_id,
            code=e.code,
            error=e.message,
        )
        payload = PDFWebhookPayload(
            job_id=request.job_id,
            status=PDFStatus.FAILED,
            error_message=f"Storage error: {e.message}",
        )
        await _send_pdf_failure_webhook(convex, payload, request.webhook_url)

    except ExtractionError as e:
        logger.error(
            "pdf_generation_error",
            job_id=request.job_id,
            code=e.code,
            error=e.message,
        )
        payload = PDFWebhookPayload(
            job_id=request.job_id,
            status=PDFStatus.FAILED,
            error_message=e.message,
        )
        await _send_pdf_failure_webhook(convex, payload, request.webhook_url)

    except Exception as e:
        logger.exception(
            "pdf_unexpected_error",
            job_id=request.job_id,
            error=str(e),
        )
        payload = PDFWebhookPayload(
            job_id=request.job_id,
            status=PDFStatus.FAILED,
            error_message="Internal processing error",
        )
        await _send_pdf_failure_webhook(convex, payload, request.webhook_url)


async def _send_pdf_failure_webhook(
    convex: ConvexClient, payload: PDFWebhookPayload, webhook_url: str
):
    """Send PDF failure notification to Convex, ignoring webhook errors."""
    try:
        await convex.send_pdf_results(payload, webhook_url)
    except WebhookError as e:
        logger.error(
            "pdf_failure_webhook_delivery_failed",
            job_id=payload.job_id,
            code=e.code,
        )


# ============================================================================
# Agent Enrichment Endpoints
# ============================================================================


@app.post("/agent/enrich", response_model=EnrichResponse)
@limiter.limit("60/minute")
async def start_enrichment(
    request: Request,
    enrich_request: EnrichRequest,
    background_tasks: BackgroundTasks,
    convex: ConvexClient = Depends(get_convex_client),
):
    """
    Start single cell enrichment job.

    The enrichment is processed in the background and results
    are sent to Convex via webhook when complete.
    """
    logger.info(
        "enrichment_requested",
        job_id=enrich_request.job_id,
        data_source=enrich_request.data_source,
        input=enrich_request.input[:50] if enrich_request.input else "",
    )

    # Queue the enrichment task
    background_tasks.add_task(
        process_enrichment,
        request=enrich_request,
        convex=convex,
    )

    return EnrichResponse(
        job_id=enrich_request.job_id,
        status=AgentStatus.PENDING,
        message="Enrichment job queued",
    )


@app.post("/agent/batch", response_model=BatchEnrichResponse)
@limiter.limit("10/minute")
async def start_batch_enrichment(
    request: Request,
    batch_request: BatchEnrichRequest,
    background_tasks: BackgroundTasks,
    convex: ConvexClient = Depends(get_convex_client),
):
    """
    Start batch enrichment for multiple cells.

    Each job is processed in the background and results
    are sent via webhook.
    """
    logger.info(
        "batch_enrichment_requested",
        job_count=len(batch_request.jobs),
    )

    # Queue each job
    for enrich_request in batch_request.jobs:
        background_tasks.add_task(
            process_enrichment,
            request=enrich_request,
            convex=convex,
        )

    return BatchEnrichResponse(
        total=len(batch_request.jobs),
        queued=len(batch_request.jobs),
        message=f"Queued {len(batch_request.jobs)} enrichment jobs",
    )


async def process_enrichment(
    request: EnrichRequest,
    convex: ConvexClient,
):
    """
    Background task to process a single enrichment job.

    Args:
        request: Enrichment request with input, prompt, data source
        convex: Convex client for sending webhook results
    """
    logger.info(
        "processing_enrichment",
        job_id=request.job_id,
        data_source=request.data_source,
    )

    try:
        # Get agent service
        agent = get_agent_service()

        # Run enrichment
        result = await agent.enrich(
            input_value=request.input,
            prompt=request.prompt,
            data_source=request.data_source.value,
        )

        # Build webhook payload
        if result.get("success"):
            payload = AgentWebhookPayload(
                job_id=request.job_id,
                status="completed",
                result=result.get("result"),
            )
        else:
            payload = AgentWebhookPayload(
                job_id=request.job_id,
                status="failed",
                error=result.get("error", "Unknown error"),
            )

        logger.info(
            "enrichment_complete",
            job_id=request.job_id,
            success=result.get("success"),
        )

        # Send webhook
        await _send_agent_webhook(convex, payload, request.webhook_url)

    except Exception as e:
        logger.exception(
            "enrichment_error",
            job_id=request.job_id,
            error=str(e),
        )

        payload = AgentWebhookPayload(
            job_id=request.job_id,
            status="failed",
            error=str(e),
        )
        await _send_agent_webhook(convex, payload, request.webhook_url)


async def _send_agent_webhook(
    convex: ConvexClient,
    payload: AgentWebhookPayload,
    webhook_url: str,
):
    """Send agent enrichment results to webhook."""
    import time
    import hmac
    import hashlib

    try:
        settings = get_settings()
        payload_json = payload.model_dump_json()
        timestamp = int(time.time())

        # Sign the payload
        message = f"{timestamp}.{payload_json}"
        signature = hmac.new(
            settings.convex_webhook_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                webhook_url,
                content=payload_json,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": signature,
                    "X-Webhook-Timestamp": str(timestamp),
                },
            )

            if response.status_code != 200:
                logger.error(
                    "agent_webhook_failed",
                    job_id=payload.job_id,
                    status_code=response.status_code,
                )

    except Exception as e:
        logger.error(
            "agent_webhook_error",
            job_id=payload.job_id,
            error=str(e),
        )


# ============================================================================
# Main Entry Point
# ============================================================================


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
