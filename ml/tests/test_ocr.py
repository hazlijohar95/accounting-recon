"""
Tests for OCR service using Mistral AI.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
import json


class TestOCRService:
    """Tests for OCRService."""

    @pytest.fixture
    def mock_mistral(self, mock_mistral_client):
        """Patch Mistral client."""
        with patch('services.ocr.Mistral', return_value=mock_mistral_client):
            yield mock_mistral_client

    @pytest.fixture
    def ocr_service(self, mock_mistral):
        """Create OCRService with mocked Mistral client."""
        from services.ocr import OCRService
        service = OCRService()
        service._client = mock_mistral
        return service

    @pytest.mark.asyncio
    async def test_extract_text_from_image(self, ocr_service, sample_image_bytes):
        """Test text extraction from image."""
        text = await ocr_service.extract_text(sample_image_bytes, "jpg")
        assert text is not None
        assert len(text) > 0

    @pytest.mark.asyncio
    async def test_extract_text_calls_mistral_api(self, ocr_service, sample_image_bytes):
        """Test that extraction calls Mistral API."""
        await ocr_service.extract_text(sample_image_bytes, "jpg")
        ocr_service._client.chat.complete_async.assert_called_once()

    @pytest.mark.asyncio
    async def test_extract_text_from_pdf(self, ocr_service, mock_mistral):
        """Test text extraction from PDF (with mocked pdf2image)."""
        from PIL import Image

        # Mock pdf2image conversion
        mock_image = Image.new('RGB', (100, 100), color='white')
        with patch('services.ocr.convert_from_bytes', return_value=[mock_image]):
            text = await ocr_service.extract_text(b"pdf content", "pdf")

        assert text is not None
        assert "Page 1" in text

    @pytest.mark.asyncio
    async def test_extract_text_multipage_pdf(self, ocr_service, mock_mistral):
        """Test extraction from multi-page PDF."""
        from PIL import Image

        # Mock multiple pages
        mock_images = [
            Image.new('RGB', (100, 100), color='white'),
            Image.new('RGB', (100, 100), color='white'),
        ]

        with patch('services.ocr.convert_from_bytes', return_value=mock_images):
            text = await ocr_service.extract_text(b"pdf content", "pdf")

        assert "Page 1" in text
        assert "Page 2" in text
        # Should call API twice (once per page)
        assert ocr_service._client.chat.complete_async.call_count == 2

    @pytest.mark.asyncio
    async def test_extract_text_pdf_conversion_failure(self, ocr_service):
        """Test handling of PDF conversion failure."""
        with patch('services.ocr.convert_from_bytes', side_effect=Exception("Corrupt PDF")):
            with pytest.raises(ValueError) as exc_info:
                await ocr_service.extract_text(b"corrupt pdf", "pdf")

            assert "Failed to convert PDF" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_extract_text_respects_max_pages(self, ocr_service, mock_mistral):
        """Test that max_pages parameter is respected."""
        from PIL import Image

        mock_image = Image.new('RGB', (100, 100), color='white')

        with patch('services.ocr.convert_from_bytes', return_value=[mock_image]) as mock_convert:
            await ocr_service.extract_text(b"pdf", "pdf", max_pages=5)

            # Check max_pages was passed to convert_from_bytes
            call_kwargs = mock_convert.call_args.kwargs
            assert call_kwargs.get("last_page") == 5

    @pytest.mark.asyncio
    async def test_extract_text_timeout(self, mock_mistral):
        """Test OCR timeout handling."""
        # Make the API call hang
        mock_mistral.chat.complete_async = AsyncMock(
            side_effect=asyncio.TimeoutError()
        )

        from services.ocr import OCRService
        service = OCRService()
        service._client = mock_mistral

        from PIL import Image
        mock_image = Image.new('RGB', (100, 100), color='white')

        with patch('services.ocr.convert_from_bytes', return_value=[mock_image]):
            with pytest.raises(asyncio.TimeoutError):
                await service.extract_text(b"pdf", "pdf")

    @pytest.mark.asyncio
    async def test_extract_structured_data_bank_statement(
        self, ocr_service, mock_mistral, mock_mistral_json_response, sample_maybank_text
    ):
        """Test structured data extraction for bank statements."""
        # Mock JSON response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_mistral_json_response)
        mock_mistral.chat.complete_async = AsyncMock(return_value=mock_response)

        result = await ocr_service.extract_structured_data(
            sample_maybank_text, "bank_statement"
        )

        assert "bank_name" in result
        assert "transactions" in result

    @pytest.mark.asyncio
    async def test_extract_structured_data_invoice(
        self, ocr_service, mock_mistral, sample_invoice_text
    ):
        """Test structured data extraction for invoices."""
        mock_invoice_response = {
            "doc_type": "purchase_invoice",
            "doc_number": "INV-2024-0042",
            "doc_date": "2024-01-15",
            "amount": 8162.00,
            "currency": "MYR",
        }

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_invoice_response)
        mock_mistral.chat.complete_async = AsyncMock(return_value=mock_response)

        result = await ocr_service.extract_structured_data(sample_invoice_text, "invoice")

        assert result["doc_type"] == "purchase_invoice"
        assert result["doc_number"] == "INV-2024-0042"

    @pytest.mark.asyncio
    async def test_extract_structured_data_unknown_type(self, ocr_service):
        """Test structured data extraction for unknown document type."""
        result = await ocr_service.extract_structured_data("some text", "unknown")
        assert result == {"raw_text": "some text"}

    @pytest.mark.asyncio
    async def test_extract_structured_data_json_error(self, ocr_service, mock_mistral):
        """Test handling of invalid JSON response."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "invalid json {"
        mock_mistral.chat.complete_async = AsyncMock(return_value=mock_response)

        result = await ocr_service.extract_structured_data("text", "bank_statement")

        assert "error" in result
        assert "JSON parsing failed" in result["error"]

    @pytest.mark.asyncio
    async def test_extract_structured_data_api_error(self, ocr_service, mock_mistral):
        """Test handling of API errors during structured extraction."""
        mock_mistral.chat.complete_async = AsyncMock(
            side_effect=Exception("API Error")
        )

        result = await ocr_service.extract_structured_data("text", "bank_statement")

        assert "error" in result
        assert "API Error" in result["error"]

    def test_ocr_uses_pixtral_model(self, ocr_service):
        """Test that OCR uses the Pixtral vision model."""
        assert ocr_service._model == "pixtral-12b-2409"

    @pytest.mark.asyncio
    async def test_image_rgba_converted_to_rgb(self, ocr_service, mock_mistral):
        """Test that RGBA images are converted to RGB."""
        from PIL import Image

        # Create RGBA image
        rgba_image = Image.new('RGBA', (100, 100), color=(255, 255, 255, 255))
        import io
        buffer = io.BytesIO()
        rgba_image.save(buffer, format='PNG')
        png_bytes = buffer.getvalue()

        # Should not raise an error
        await ocr_service.extract_text(png_bytes, "png")
