"""
OCR Service using Mistral AI Vision.

This module provides document text extraction capabilities using Mistral's
Pixtral vision model for OCR. It supports both PDF and image files, with
specialized extraction for financial documents (bank statements and invoices).

Architecture:
    - Uses pdf2image to convert PDFs to images for processing
    - Leverages Mistral's Pixtral-12b model for visual text extraction
    - Provides structured data extraction using Mistral Large for JSON output

Supported Document Types:
    - Bank statements (Malaysian banks)
    - Invoices and receipts
    - Generic documents (raw text extraction)

Example:
    >>> from services.ocr import OCRService
    >>> ocr = OCRService()
    >>> text = await ocr.extract_text(pdf_bytes, "pdf")
    >>> structured = await ocr.extract_structured_data(text, "invoice")
"""

import asyncio
import base64
import io
from typing import Optional
import structlog
from mistralai import Mistral
from pdf2image import convert_from_bytes
from PIL import Image

from config import get_settings

logger = structlog.get_logger()


class OCRService:
    """
    Service for OCR using Mistral AI vision capabilities.

    This service provides optical character recognition for financial documents
    using Mistral's Pixtral vision model. It handles PDF-to-image conversion,
    text extraction, and structured data parsing for bank statements and invoices.

    Attributes:
        _client: Mistral API client instance
        _model: Vision model identifier (pixtral-12b-2409)

    Configuration:
        Requires MISTRAL_API_KEY environment variable to be set.

    Example:
        >>> service = OCRService()
        >>> with open("statement.pdf", "rb") as f:
        ...     text = await service.extract_text(f.read(), "pdf")
        >>> print(text[:100])
    """

    def __init__(self):
        settings = get_settings()
        self._client = Mistral(api_key=settings.mistral_api_key)
        self._model = "pixtral-12b-2409"  # Mistral's vision model

    async def extract_text(
        self,
        file_content: bytes,
        file_type: str,
        max_pages: int = 20,
    ) -> str:
        """
        Extract text from a document using Mistral OCR

        Args:
            file_content: Document content as bytes
            file_type: File type (pdf, jpg, png)
            max_pages: Maximum pages to process for PDFs

        Returns:
            Extracted text from the document
        """
        logger.info("extracting_text", file_type=file_type, size=len(file_content))

        if file_type.lower() == "pdf":
            return await self._extract_from_pdf(file_content, max_pages)
        else:
            return await self._extract_from_image(file_content)

    async def _extract_from_pdf(self, pdf_content: bytes, max_pages: int) -> str:
        """
        Extract text from a PDF document by converting pages to images.

        Converts each PDF page to a JPEG image at 200 DPI (balancing quality
        and performance), then processes each image through the vision model.

        Args:
            pdf_content: Raw PDF file bytes
            max_pages: Maximum number of pages to process (1-indexed)

        Returns:
            Concatenated text from all pages, with page separators

        Raises:
            ValueError: If PDF conversion fails (corrupt file, password protected)

        Note:
            Large PDFs may take significant time. Consider using max_pages
            to limit processing for previews.
        """
        logger.info("converting_pdf_to_images")

        # Convert PDF pages to images
        try:
            images = convert_from_bytes(
                pdf_content,
                dpi=200,  # Good balance of quality and speed
                first_page=1,
                last_page=max_pages,
            )
        except Exception as e:
            logger.error("pdf_conversion_failed", error=str(e))
            raise ValueError(f"Failed to convert PDF: {str(e)}")

        logger.info("pdf_converted", page_count=len(images))

        # Extract text from each page
        all_text = []
        for i, image in enumerate(images):
            logger.info("processing_page", page=i + 1, total=len(images))
            page_text = await self._extract_from_pil_image(image, page_num=i + 1)
            all_text.append(f"--- Page {i + 1} ---\n{page_text}")

        return "\n\n".join(all_text)

    async def _extract_from_image(self, image_content: bytes) -> str:
        """
        Extract text from an image file (JPEG, PNG, etc.).

        Args:
            image_content: Raw image file bytes

        Returns:
            Extracted text from the image

        Note:
            PNG images with transparency are converted to RGB before processing.
        """
        image = Image.open(io.BytesIO(image_content))
        return await self._extract_from_pil_image(image)

    async def _extract_from_pil_image(
        self,
        image: Image.Image,
        page_num: Optional[int] = None,
    ) -> str:
        """
        Extract text from a PIL Image using Mistral's vision model.

        Converts the image to base64-encoded JPEG and sends it to the
        Pixtral model with a financial document extraction prompt.

        Args:
            image: PIL Image object to process
            page_num: Optional page number for logging (1-indexed)

        Returns:
            Extracted text preserving structure and formatting

        Raises:
            Exception: If Mistral API call fails (rate limit, auth, etc.)

        Note:
            Images are compressed to JPEG quality 85 to reduce API payload
            while maintaining OCR accuracy.
        """
        # Convert image to base64
        buffer = io.BytesIO()
        # Convert to RGB if necessary (for PNG with transparency)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.save(buffer, format="JPEG", quality=85)
        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        # Call Mistral with the image
        prompt = """Extract ALL text from this document image.
This is a financial document (bank statement or invoice).
Preserve the structure and formatting as much as possible.
Include ALL numbers, dates, amounts, and reference numbers exactly as they appear.
For tables, maintain column alignment using spaces or tabs."""

        try:
            settings = get_settings()
            timeout_seconds = settings.ocr_timeout_seconds

            # SECURITY: Add timeout protection to prevent hanging on slow LLM responses
            async with asyncio.timeout(timeout_seconds):
                response = await self._client.chat.complete_async(
                    model=self._model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": f"data:image/jpeg;base64,{image_base64}",
                                },
                                {"type": "text", "text": prompt},
                            ],
                        }
                    ],
                    max_tokens=4096,
                )

            text = response.choices[0].message.content
            logger.info(
                "ocr_completed",
                page=page_num,
                text_length=len(text) if text else 0,
            )
            return text or ""

        except asyncio.TimeoutError:
            logger.error(
                "mistral_ocr_timeout",
                page=page_num,
                timeout_seconds=timeout_seconds,
            )
            raise TimeoutError(f"OCR timed out after {timeout_seconds} seconds")
        except Exception as e:
            logger.error("mistral_ocr_failed", page=page_num, error=str(e))
            raise

    async def extract_structured_data(
        self,
        text: str,
        document_type: str,
    ) -> dict:
        """
        Use Mistral to extract structured data from OCR text

        Args:
            text: OCR-extracted text
            document_type: Type of document (bank_statement, invoice, etc.)

        Returns:
            Structured data extracted from the text
        """
        if document_type == "bank_statement":
            return await self._extract_bank_statement_data(text)
        elif document_type in ("invoice", "receipt"):
            return await self._extract_invoice_data(text)
        else:
            return {"raw_text": text}

    async def _extract_bank_statement_data(self, text: str) -> dict:
        """
        Extract structured bank statement data using Mistral Large.

        Parses OCR text to extract structured fields including bank details,
        account information, statement period, and individual transactions.

        Args:
            text: Raw OCR text from bank statement

        Returns:
            Dictionary containing:
                - bank_name: Name of the bank
                - account_number: Account number (may be masked)
                - account_holder: Account holder name
                - period_start: Statement start date (YYYY-MM-DD)
                - period_end: Statement end date (YYYY-MM-DD)
                - opening_balance: Opening balance amount
                - closing_balance: Closing balance amount
                - currency: Currency code (e.g., MYR)
                - transactions: List of transaction dictionaries

            On error, returns {"raw_text": text, "error": error_message}

        Note:
            Uses mistral-large-latest model for better JSON structure accuracy.
            Response is limited to 8192 tokens for large statements.
        """
        prompt = f"""Analyze this bank statement text and extract structured data.
Return a JSON object with:
- bank_name: Name of the bank
- account_number: Account number (masked or full)
- account_holder: Name of account holder
- period_start: Statement start date (YYYY-MM-DD format)
- period_end: Statement end date (YYYY-MM-DD format)
- opening_balance: Opening balance as a number
- closing_balance: Closing balance as a number
- currency: Currency code (e.g., MYR)
- transactions: Array of objects with:
  - date: Transaction date (YYYY-MM-DD)
  - description: Transaction description
  - reference: Reference number if present
  - amount: Amount (positive for credits, negative for debits)
  - balance: Balance after transaction if shown

Bank Statement Text:
{text}

Return ONLY valid JSON, no other text."""

        import json

        settings = get_settings()
        timeout_seconds = settings.ocr_timeout_seconds

        try:
            # SECURITY: Add timeout protection to prevent hanging on slow LLM responses
            async with asyncio.timeout(timeout_seconds):
                response = await self._client.chat.complete_async(
                    model="mistral-large-latest",  # Use large model for structured extraction
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    max_tokens=8192,
                )

            return json.loads(response.choices[0].message.content)
        except asyncio.TimeoutError:
            logger.error(
                "bank_statement_extraction_timeout",
                timeout_seconds=timeout_seconds,
            )
            return {"raw_text": text, "error": f"Extraction timed out after {timeout_seconds} seconds"}
        except json.JSONDecodeError as e:
            # LLM returned invalid JSON - log separately for debugging
            logger.error(
                "structured_extraction_json_error",
                error=str(e),
                response_content=response.choices[0].message.content[:500] if response else None,
            )
            return {"raw_text": text, "error": f"JSON parsing failed: {str(e)}"}
        except Exception as e:
            logger.error("structured_extraction_failed", error=str(e))
            return {"raw_text": text, "error": str(e)}

    async def _extract_invoice_data(self, text: str) -> dict:
        """
        Extract structured invoice/receipt data using Mistral Large.

        Parses OCR text to extract structured invoice fields including
        document metadata, amounts, tax information, and line items.

        Args:
            text: Raw OCR text from invoice or receipt

        Returns:
            Dictionary containing:
                - doc_type: One of sales_invoice, purchase_invoice, receipt, pos_report
                - doc_number: Invoice/receipt number
                - doc_date: Document date (YYYY-MM-DD)
                - due_date: Payment due date (YYYY-MM-DD) if present
                - counterparty: Customer or supplier name
                - counterparty_address: Address if present
                - subtotal: Subtotal before tax
                - tax_amount: Tax/SST amount
                - amount: Total amount
                - currency: Currency code (e.g., MYR)
                - tax_number: Tax registration number if present
                - line_items: List of line item dictionaries

            On error, returns {"raw_text": text, "error": error_message}

        Note:
            Uses mistral-large-latest model for better JSON structure accuracy.
            Response is limited to 4096 tokens.
        """
        prompt = f"""Analyze this invoice/receipt text and extract structured data.
Return a JSON object with:
- doc_type: One of "sales_invoice", "purchase_invoice", "receipt", "pos_report"
- doc_number: Invoice/receipt number
- doc_date: Document date (YYYY-MM-DD format)
- due_date: Payment due date if present (YYYY-MM-DD)
- counterparty: Customer or supplier name
- counterparty_address: Address if present
- subtotal: Subtotal before tax
- tax_amount: Tax/SST amount
- amount: Total amount
- currency: Currency code (e.g., MYR)
- tax_number: Tax registration number if present
- line_items: Array of objects with:
  - description: Item description
  - quantity: Quantity if shown
  - unit_price: Unit price if shown
  - amount: Line item amount

Invoice/Receipt Text:
{text}

Return ONLY valid JSON, no other text."""

        import json

        settings = get_settings()
        timeout_seconds = settings.ocr_timeout_seconds

        try:
            # SECURITY: Add timeout protection to prevent hanging on slow LLM responses
            async with asyncio.timeout(timeout_seconds):
                response = await self._client.chat.complete_async(
                    model="mistral-large-latest",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    max_tokens=4096,
                )

            return json.loads(response.choices[0].message.content)
        except asyncio.TimeoutError:
            logger.error(
                "invoice_extraction_timeout",
                timeout_seconds=timeout_seconds,
            )
            return {"raw_text": text, "error": f"Extraction timed out after {timeout_seconds} seconds"}
        except json.JSONDecodeError as e:
            # LLM returned invalid JSON - log separately for debugging
            logger.error(
                "invoice_extraction_json_error",
                error=str(e),
                response_content=response.choices[0].message.content[:500] if response else None,
            )
            return {"raw_text": text, "error": f"JSON parsing failed: {str(e)}"}
        except Exception as e:
            logger.error("structured_extraction_failed", error=str(e))
            return {"raw_text": text, "error": str(e)}
