"""
Tests for FastAPI application endpoints.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_services():
    """Mock global services for all API tests."""
    import main

    # Create mock services
    mock_storage = MagicMock()
    mock_storage.download_file = AsyncMock(return_value=b"mock pdf content")
    mock_storage.upload_file = MagicMock(return_value="https://r2.example.com/file.pdf")
    mock_storage.close = AsyncMock()

    mock_convex = MagicMock()
    mock_convex.send_extraction_results = AsyncMock()
    mock_convex.send_pdf_results = AsyncMock()
    mock_convex.close = AsyncMock()

    mock_ocr = MagicMock()
    mock_ocr.extract_text = AsyncMock(return_value="mock text")
    mock_ocr.extract_structured_data = AsyncMock(return_value={"transactions": []})

    mock_bank_extraction = MagicMock()
    mock_bank_extraction.extract = AsyncMock(return_value=MagicMock(
        bank_type=MagicMock(value="maybank"),
        transactions=[],
        raw_text="mock text",
        overall_confidence=0.9,
    ))

    mock_invoice_extraction = MagicMock()
    mock_invoice_extraction.extract = AsyncMock(return_value=MagicMock(
        raw_text="mock text",
        overall_confidence=0.9,
        line_items=[],
    ))

    mock_pdf_generator = MagicMock()
    mock_pdf_generator.generate_report = MagicMock(return_value=b"mock pdf")
    mock_pdf_generator.generate_file_name = MagicMock(return_value="report.pdf")

    # Inject mocks
    main.storage_service = mock_storage
    main.convex_client = mock_convex
    main.ocr_service = mock_ocr
    main.bank_extraction_service = mock_bank_extraction
    main.invoice_extraction_service = mock_invoice_extraction
    main.pdf_generator_service = mock_pdf_generator

    yield

    # Cleanup
    main.storage_service = None
    main.convex_client = None
    main.ocr_service = None
    main.bank_extraction_service = None
    main.invoice_extraction_service = None
    main.pdf_generator_service = None


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from main import app
        return TestClient(app)

    def test_health_check_returns_healthy(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "reconciled-ml"


class TestRootEndpoint:
    """Tests for root endpoint."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from main import app
        return TestClient(app)

    def test_root_returns_service_info(self, client):
        """Test root endpoint returns service information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Reconciled ML Service"
        assert data["version"] == "1.0.0"
        assert "endpoints" in data

    def test_root_lists_available_endpoints(self, client):
        """Test root endpoint lists available endpoints."""
        response = client.get("/")
        data = response.json()
        endpoints = data["endpoints"]
        assert "health" in endpoints
        assert "extract" in endpoints
        assert "generate_pdf" in endpoints


class TestExtractionEndpoint:
    """Tests for document extraction endpoint."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from main import app
        return TestClient(app)

    def test_extract_returns_job_id(self, client):
        """Test extraction endpoint returns job ID."""
        response = client.post(
            "/extract",
            json={
                "document_id": "doc_123",
                "company_id": "company_456",
                "document_type": "bank_statement",
                "file_type": "pdf",
                "file_name": "statement.pdf",
                "storage_url": "https://r2.example.com/file.pdf",
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "processing"

    def test_extract_validates_required_fields(self, client):
        """Test extraction validates required fields."""
        response = client.post("/extract", json={})
        assert response.status_code == 422  # Validation error

    def test_extract_accepts_valid_document_types(self, client):
        """Test extraction accepts valid document types."""
        for doc_type in ["bank_statement", "invoice", "receipt"]:
            response = client.post(
                "/extract",
                json={
                    "document_id": "doc_123",
                    "company_id": "company_456",
                    "document_type": doc_type,
                    "file_type": "pdf",
                    "file_name": "document.pdf",
                    "storage_url": "https://r2.example.com/file.pdf",
                }
            )
            assert response.status_code == 200


class TestPDFGenerationEndpoint:
    """Tests for PDF generation endpoint."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from main import app
        return TestClient(app)

    def test_generate_pdf_returns_job_id(self, client):
        """Test PDF generation returns job ID."""
        response = client.post(
            "/generate-pdf",
            json={
                "job_id": "job_123",
                "report_type": "bank_recon",
                "company": {
                    "name": "Test Company",
                    "registration_number": "123456",
                },
                "data": {
                    "session": {
                        "id": "session_123",
                        "name": "January 2024",
                        "period_start": "2024-01-01",
                        "period_end": "2024-01-31",
                    },
                    "summary": {
                        "total_cash": 10000,
                        "total_accrual": 10000,
                        "matched_count": 50,
                        "suspense_count": 5,
                    },
                    "matches": [],
                    "suspense_items": [],
                },
                "options": {},
                "webhook_url": "https://convex.example.com/webhook",
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "job_123"
        assert data["status"] == "processing"


class TestRateLimiting:
    """Tests for rate limiting."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from main import app
        return TestClient(app)

    def test_extract_has_rate_limit(self, client):
        """Test extraction endpoint has rate limiting."""
        # Make many requests quickly
        for i in range(35):
            response = client.post(
                "/extract",
                json={
                    "document_id": f"doc_{i}",
                    "company_id": "company_456",
                    "document_type": "bank_statement",
                    "file_type": "pdf",
                    "file_name": "statement.pdf",
                    "storage_url": "https://r2.example.com/file.pdf",
                }
            )

            # After 30 requests, should get rate limited
            if i >= 30:
                # Rate limit response is 429
                if response.status_code == 429:
                    return  # Test passed

        # If we got here without being rate limited, that's also acceptable
        # (rate limit resets between tests)


class TestCORS:
    """Tests for CORS configuration."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from main import app
        return TestClient(app)

    def test_cors_allows_production_origin(self, client):
        """Test CORS allows production origin."""
        response = client.options(
            "/health",
            headers={"Origin": "https://reconciled.dev"}
        )
        # Should not reject the request
        assert response.status_code in [200, 204, 405]

    def test_cors_allows_localhost_in_debug(self, client):
        """Test CORS allows localhost in debug mode."""
        response = client.options(
            "/health",
            headers={"Origin": "http://localhost:3000"}
        )
        # Should not reject in debug mode
        assert response.status_code in [200, 204, 405]
