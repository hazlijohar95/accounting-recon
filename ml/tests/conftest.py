"""
Shared test fixtures for ML service tests.

This module provides mock fixtures for external services:
- Mistral API (OCR)
- Cloudflare R2 (Storage)
- Convex (Webhook)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Generator
import os

# Set up test environment variables before importing config
os.environ.setdefault("R2_ACCOUNT_ID", "test_account_id_12345")
os.environ.setdefault("R2_ACCESS_KEY_ID", "test_access_key_12345")
os.environ.setdefault("R2_SECRET_ACCESS_KEY", "test_secret_key_12345")
os.environ.setdefault("R2_BUCKET_NAME", "test-bucket")
os.environ.setdefault("MISTRAL_API_KEY", "sk-test-api-key-for-testing-12345")
os.environ.setdefault("CONVEX_URL", "https://test.convex.cloud")
os.environ.setdefault("CONVEX_WEBHOOK_SECRET", "test_webhook_secret_12345")
os.environ.setdefault("DEBUG", "true")


# Sample bank statement text for testing
SAMPLE_MAYBANK_TEXT = """
--- Page 1 ---
MAYBANK
MALAYAN BANKING BERHAD

Statement of Account
Account No: 5123-4567-8901-2345
Account Holder: JOHN DOE TRADING SDN BHD

Statement Period: 01/01/2024 to 31/01/2024

Opening Balance: 10,000.00

DATE        DESCRIPTION                  REF         AMOUNT      BALANCE
01/01/2024  OPENING BALANCE                                      10,000.00
05/01/2024  IBG TRANSFER IN              TXN123456   5,000.00    15,000.00
10/01/2024  PAYMENT TO SUPPLIER          INV-2024-01 -2,500.00   12,500.00
15/01/2024  MAYBANK2U PAYMENT            REF789012   -1,000.00   11,500.00
20/01/2024  CASH DEPOSIT                 DEP456789   3,000.00    14,500.00
31/01/2024  BANK CHARGES                 CHG-JAN     -25.00      14,475.00

Closing Balance: 14,475.00
"""

SAMPLE_CIMB_TEXT = """
--- Page 1 ---
CIMB BANK BERHAD

e-Statement
A/C No: 8001234567

Period: 01-02-2024 to 28-02-2024

Beginning Balance: 5,000.00 CR

02 Feb 2024  SALARY CREDIT               SAL2024     8,500.00 CR  13,500.00 CR
05 Feb 2024  JomPAY PAYMENT             PAY123       500.00 DR    13,000.00 CR
15 Feb 2024  ATM WITHDRAWAL             ATM567       300.00 DR    12,700.00 CR
28 Feb 2024  SERVICE CHARGE             SVC-FEB      15.00 DR     12,685.00 CR

Ending Balance: 12,685.00 CR
"""

SAMPLE_INVOICE_TEXT = """
INVOICE

Invoice No: INV-2024-0042
Date: 15 Jan 2024
Due Date: 15 Feb 2024

From:
ABC Supplies Sdn Bhd
No. 123, Jalan Industri
40000 Shah Alam, Selangor

To:
XYZ Company Sdn Bhd
Level 10, Tower A
50100 Kuala Lumpur

Item                          Qty    Unit Price    Amount
Office Supplies                10      150.00     1,500.00
Computer Equipment              2    2,500.00     5,000.00
Software License                1    1,200.00     1,200.00

                              Subtotal:          7,700.00
                              SST (6%):            462.00
                              TOTAL:             8,162.00

Tax Registration No: MY-123456789012
"""


@pytest.fixture
def sample_maybank_text() -> str:
    """Sample Maybank statement text for testing."""
    return SAMPLE_MAYBANK_TEXT


@pytest.fixture
def sample_cimb_text() -> str:
    """Sample CIMB statement text for testing."""
    return SAMPLE_CIMB_TEXT


@pytest.fixture
def sample_invoice_text() -> str:
    """Sample invoice text for testing."""
    return SAMPLE_INVOICE_TEXT


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Sample minimal PDF bytes for testing (1x1 pixel PDF)."""
    # This is a minimal valid PDF that can be used for testing
    return b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
192
%%EOF"""


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Sample 1x1 white JPEG image bytes for testing."""
    # Minimal valid JPEG (1x1 white pixel)
    return bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xA0, 0x02, 0x80,
        0x0A, 0x00, 0xFF, 0xD9
    ])


@pytest.fixture
def mock_mistral_client():
    """Mock Mistral API client for OCR tests."""
    mock = MagicMock()
    mock.chat = MagicMock()

    # Mock response for OCR
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message = MagicMock()
    mock_response.choices[0].message.content = SAMPLE_MAYBANK_TEXT

    # Make the complete_async return an awaitable
    mock.chat.complete_async = AsyncMock(return_value=mock_response)

    return mock


@pytest.fixture
def mock_mistral_json_response():
    """Mock Mistral response with JSON bank statement data."""
    return {
        "bank_name": "Maybank",
        "account_number": "5123-4567-8901-2345",
        "account_holder": "JOHN DOE TRADING SDN BHD",
        "period_start": "2024-01-01",
        "period_end": "2024-01-31",
        "opening_balance": 10000.00,
        "closing_balance": 14475.00,
        "currency": "MYR",
        "transactions": [
            {
                "date": "2024-01-05",
                "description": "IBG TRANSFER IN",
                "reference": "TXN123456",
                "amount": 5000.00,
                "balance": 15000.00
            },
            {
                "date": "2024-01-10",
                "description": "PAYMENT TO SUPPLIER",
                "reference": "INV-2024-01",
                "amount": -2500.00,
                "balance": 12500.00
            },
            {
                "date": "2024-01-15",
                "description": "MAYBANK2U PAYMENT",
                "reference": "REF789012",
                "amount": -1000.00,
                "balance": 11500.00
            },
            {
                "date": "2024-01-20",
                "description": "CASH DEPOSIT",
                "reference": "DEP456789",
                "amount": 3000.00,
                "balance": 14500.00
            },
            {
                "date": "2024-01-31",
                "description": "BANK CHARGES",
                "reference": "CHG-JAN",
                "amount": -25.00,
                "balance": 14475.00
            }
        ]
    }


@pytest.fixture
def mock_storage_service():
    """Mock StorageService for R2 operations."""
    mock = MagicMock()
    mock.download_file = AsyncMock(return_value=b"mock pdf content")
    mock.download_file_sync = MagicMock(return_value=b"mock pdf content")
    mock.upload_file = MagicMock(return_value="https://r2.example.com/file.pdf")
    mock.generate_presigned_url = MagicMock(return_value="https://r2.example.com/presigned")
    mock.close = AsyncMock()
    return mock


@pytest.fixture
def mock_convex_client():
    """Mock ConvexClient for webhook operations."""
    mock = MagicMock()
    mock.send_extraction_results = AsyncMock()
    mock.send_pdf_results = AsyncMock()
    mock.close = AsyncMock()
    return mock


@pytest.fixture
def mock_httpx_client():
    """Mock httpx client for async HTTP requests."""
    mock = MagicMock()
    mock_response = MagicMock()
    mock_response.content = b"mock file content"
    mock_response.headers = {"content-length": "100"}
    mock_response.raise_for_status = MagicMock()
    mock.get = AsyncMock(return_value=mock_response)
    mock.post = AsyncMock(return_value=mock_response)
    mock.aclose = AsyncMock()
    return mock


@pytest.fixture
def mock_boto3_client():
    """Mock boto3 S3 client for R2 operations."""
    mock = MagicMock()
    mock.get_object = MagicMock(return_value={
        "Body": MagicMock(read=MagicMock(return_value=b"mock content"))
    })
    mock.put_object = MagicMock()
    mock.generate_presigned_url = MagicMock(return_value="https://example.com/presigned")
    return mock


@pytest.fixture(autouse=True)
def clear_settings_cache():
    """Clear the settings LRU cache before each test."""
    from config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
