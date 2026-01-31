"""
Dependency Injection Container for Reconciled ML Service.

This module provides FastAPI dependency injection for services,
replacing global mutable state with proper dependency management.

Benefits:
- Services are properly scoped and testable
- Configuration changes don't require code changes
- Easy to mock services in tests
- Thread-safe service initialization

Usage in endpoints:
    @app.post("/extract")
    async def start_extraction(
        request: ExtractionRequest,
        storage: StorageService = Depends(get_storage_service),
        extraction: BankExtractionService = Depends(get_bank_extraction_service),
    ):
        # Use injected services

Testing:
    # Override dependency for testing
    app.dependency_overrides[get_storage_service] = lambda: mock_storage
"""

from functools import lru_cache
from typing import Generator

from fastapi import Depends

from config import get_settings, Settings
from services import (
    StorageService,
    OCRService,
    ConvexClient,
    BankExtractionService,
    InvoiceExtractionService,
    PDFGeneratorService,
)
from middleware import PerUserRateLimiter


# ============================================================================
# Configuration
# ============================================================================


def get_config() -> Settings:
    """
    Get application settings.

    This is a thin wrapper around get_settings() to allow
    dependency injection in tests.
    """
    return get_settings()


# ============================================================================
# Core Services (Singleton-scoped via lru_cache)
# ============================================================================


@lru_cache()
def get_storage_service() -> StorageService:
    """
    Get singleton StorageService instance.

    The service is cached for the application lifetime.
    Use cache_clear() to reset in tests.
    """
    return StorageService()


@lru_cache()
def get_ocr_service() -> OCRService:
    """
    Get singleton OCRService instance.

    The service is cached for the application lifetime.
    """
    return OCRService()


@lru_cache()
def get_convex_client() -> ConvexClient:
    """
    Get singleton ConvexClient instance.

    The client is cached and should be closed on shutdown.
    """
    return ConvexClient()


@lru_cache()
def get_pdf_generator_service() -> PDFGeneratorService:
    """
    Get singleton PDFGeneratorService instance.
    """
    return PDFGeneratorService()


# ============================================================================
# Extraction Services (Depend on core services)
# ============================================================================


def get_bank_extraction_service(
    ocr: OCRService = Depends(get_ocr_service),
) -> BankExtractionService:
    """
    Get BankExtractionService with injected OCR service.

    A new instance is created per request, but the underlying
    OCR service is shared.
    """
    return BankExtractionService(ocr)


def get_invoice_extraction_service(
    ocr: OCRService = Depends(get_ocr_service),
) -> InvoiceExtractionService:
    """
    Get InvoiceExtractionService with injected OCR service.

    A new instance is created per request, but the underlying
    OCR service is shared.
    """
    return InvoiceExtractionService(ocr)


# ============================================================================
# Rate Limiting
# ============================================================================


@lru_cache()
def get_user_rate_limiter() -> PerUserRateLimiter:
    """
    Get singleton per-user rate limiter.

    Default: 30 requests per minute per company.
    """
    settings = get_settings()
    return PerUserRateLimiter(
        requests_per_minute=settings.rate_limit_requests_per_minute,
    )


@lru_cache()
def get_pdf_rate_limiter() -> PerUserRateLimiter:
    """
    Get singleton PDF generation rate limiter.

    Default: 10 requests per minute per company.
    """
    return PerUserRateLimiter(
        requests_per_minute=10,
    )


# ============================================================================
# Cleanup Utilities
# ============================================================================


def clear_service_caches():
    """
    Clear all service caches.

    Used in tests to reset singleton services between test cases.
    """
    get_storage_service.cache_clear()
    get_ocr_service.cache_clear()
    get_convex_client.cache_clear()
    get_pdf_generator_service.cache_clear()
    get_user_rate_limiter.cache_clear()
    get_pdf_rate_limiter.cache_clear()


async def shutdown_services():
    """
    Gracefully shutdown all services.

    Called during application shutdown to close connections.
    """
    storage = get_storage_service()
    convex = get_convex_client()

    await storage.close()
    await convex.close()

    clear_service_caches()
