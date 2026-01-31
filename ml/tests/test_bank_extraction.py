"""
Tests for bank statement extraction service.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from models import BankType, BankTransaction, BankStatementExtractionResult


class TestBankExtractionService:
    """Tests for BankExtractionService."""

    @pytest.fixture
    def mock_ocr_service(self, sample_maybank_text, mock_mistral_json_response):
        """Create a mock OCR service."""
        mock = MagicMock()
        mock.extract_text = AsyncMock(return_value=sample_maybank_text)
        mock.extract_structured_data = AsyncMock(return_value=mock_mistral_json_response)
        return mock

    @pytest.fixture
    def extraction_service(self, mock_ocr_service):
        """Create extraction service with mocked OCR."""
        from services.bank_extraction import BankExtractionService
        return BankExtractionService(mock_ocr_service)

    @pytest.mark.asyncio
    async def test_extract_bank_statement_success(
        self, extraction_service, mock_ocr_service, sample_pdf_bytes
    ):
        """Test successful bank statement extraction."""
        result = await extraction_service.extract(sample_pdf_bytes, "pdf")

        assert isinstance(result, BankStatementExtractionResult)
        assert result.bank_type == BankType.MAYBANK
        assert len(result.transactions) == 5
        assert result.account_number == "5123-4567-8901-2345"
        assert result.currency == "MYR"

    @pytest.mark.asyncio
    async def test_extract_parses_transactions(
        self, extraction_service, sample_pdf_bytes
    ):
        """Test that transactions are correctly parsed."""
        result = await extraction_service.extract(sample_pdf_bytes, "pdf")

        # Check first transaction
        tx = result.transactions[0]
        assert tx.date == "2024-01-05"
        assert tx.description == "IBG TRANSFER IN"
        assert tx.reference == "TXN123456"
        assert tx.amount == 5000.00

    @pytest.mark.asyncio
    async def test_extract_fallback_to_regex(
        self, mock_ocr_service, sample_maybank_text, sample_pdf_bytes
    ):
        """Test fallback to regex parsing when LLM fails."""
        from services.bank_extraction import BankExtractionService

        # Simulate LLM extraction failure
        mock_ocr_service.extract_structured_data = AsyncMock(
            return_value={"error": "LLM extraction failed", "raw_text": sample_maybank_text}
        )

        service = BankExtractionService(mock_ocr_service)
        result = await service.extract(sample_pdf_bytes, "pdf")

        # Should still extract transactions via regex fallback
        assert isinstance(result, BankStatementExtractionResult)
        assert len(result.transactions) > 0
        assert any("Structured extraction failed" in w for w in result.warnings)

    @pytest.mark.asyncio
    async def test_extract_calculates_confidence(
        self, extraction_service, sample_pdf_bytes
    ):
        """Test confidence calculation."""
        result = await extraction_service.extract(sample_pdf_bytes, "pdf")

        # With complete data, confidence should be high
        assert result.overall_confidence > 0.7

    @pytest.mark.asyncio
    async def test_extract_includes_raw_text(
        self, extraction_service, sample_pdf_bytes, sample_maybank_text
    ):
        """Test that raw OCR text is included in result."""
        result = await extraction_service.extract(sample_pdf_bytes, "pdf")

        assert result.raw_text == sample_maybank_text

    def test_parse_transactions_from_structured_data(
        self, extraction_service, mock_mistral_json_response
    ):
        """Test _parse_transactions method."""
        transactions = extraction_service._parse_transactions(
            mock_mistral_json_response, BankType.MAYBANK
        )

        assert len(transactions) == 5
        assert all(isinstance(tx, BankTransaction) for tx in transactions)
        assert all(tx.confidence == 0.9 for tx in transactions)

    def test_parse_transactions_skips_invalid(self, extraction_service):
        """Test that invalid transactions are skipped."""
        data = {
            "transactions": [
                {"date": "2024-01-01", "description": "Valid", "amount": 100},
                {"invalid": "transaction"},  # Missing required fields
                {"date": "2024-01-02", "description": "Also valid", "amount": 200},
            ]
        }

        transactions = extraction_service._parse_transactions(data, BankType.MAYBANK)
        assert len(transactions) == 2

    def test_calculate_confidence_no_transactions(self, extraction_service):
        """Test confidence is low when no transactions found."""
        confidence = extraction_service._calculate_confidence([], {})
        assert confidence == 0.5

    def test_calculate_confidence_with_complete_data(
        self, extraction_service, mock_mistral_json_response
    ):
        """Test confidence calculation with complete data."""
        transactions = [
            BankTransaction(date="2024-01-01", description="Test", amount=100, confidence=0.9)
            for _ in range(10)
        ]

        confidence = extraction_service._calculate_confidence(
            transactions, mock_mistral_json_response
        )

        # Should be high with complete data
        assert confidence >= 0.8

    def test_collect_warnings_empty(self, extraction_service):
        """Test no warnings for complete data."""
        data = {
            "account_number": "123456",
            "period_start": "2024-01-01",
            "period_end": "2024-01-31",
        }
        transactions = [
            BankTransaction(date="2024-01-01", description="Test", amount=100, confidence=0.9)
        ]

        warnings = extraction_service._collect_warnings(data, transactions)
        assert len(warnings) == 0

    def test_collect_warnings_missing_data(self, extraction_service):
        """Test warnings for missing data."""
        warnings = extraction_service._collect_warnings({}, [])

        assert "No transactions could be extracted" in warnings
        assert "Account number not detected" in warnings
        assert "Statement period not detected" in warnings

    def test_collect_warnings_low_confidence(self, extraction_service):
        """Test warning for low confidence transactions."""
        transactions = [
            BankTransaction(date="2024-01-01", description="Test", amount=100, confidence=0.5)
        ]

        warnings = extraction_service._collect_warnings(
            {"account_number": "123", "period_start": "2024-01-01", "period_end": "2024-01-31"},
            transactions
        )

        assert any("low confidence" in w for w in warnings)
