"""
Invoice and Receipt Extraction Service.

This module orchestrates the extraction of structured data from invoices,
receipts, POS reports, and settlement documents. It combines OCR text
extraction with intelligent document type detection and confidence scoring.

Architecture:
    - Uses OCRService for text extraction and structured parsing
    - Applies document type detection using keyword matching
    - Calculates confidence scores based on field completeness
    - Validates extracted data against expected totals

Supported Document Types:
    - Sales invoices
    - Purchase invoices  
    - Receipts
    - POS reports
    - Settlement statements

Example:
    >>> from services.ocr import OCRService
    >>> from services.invoice_extraction import InvoiceExtractionService
    >>> ocr = OCRService()
    >>> extractor = InvoiceExtractionService(ocr)
    >>> result = await extractor.extract(pdf_bytes, "pdf", "invoice")
    >>> print(f"Total: {result.currency} {result.amount}")
"""

import structlog

from models import (
    InvoiceLineItem,
    InvoiceExtractionResult,
    DocumentType,
)
from .ocr import OCRService

logger = structlog.get_logger()


class InvoiceExtractionService:
    """
    Service for extracting structured data from invoices and receipts.

    Orchestrates the full extraction pipeline: OCR → type detection →
    structured parsing → confidence calculation → validation.

    Attributes:
        _ocr: OCRService instance for text and structured data extraction

    Example:
        >>> service = InvoiceExtractionService(OCRService())
        >>> with open("invoice.pdf", "rb") as f:
        ...     result = await service.extract(f.read(), "pdf")
        >>> print(f"Invoice {result.doc_number}: {result.amount}")
    """

    def __init__(self, ocr_service: OCRService):
        """
        Initialize the invoice extraction service.

        Args:
            ocr_service: Configured OCRService instance for text extraction
        """
        self._ocr = ocr_service

    async def extract(
        self,
        file_content: bytes,
        file_type: str,
        expected_type: str = "invoice",
    ) -> InvoiceExtractionResult:
        """
        Extract data from an invoice or receipt

        Args:
            file_content: PDF or image bytes
            file_type: File type (pdf, jpg, png)
            expected_type: Expected document type hint

        Returns:
            Extraction result with invoice data
        """
        logger.info("starting_invoice_extraction", file_type=file_type)

        # Step 1: OCR the document
        raw_text = await self._ocr.extract_text(file_content, file_type)
        logger.info("ocr_complete", text_length=len(raw_text))

        # Step 2: Detect document type
        doc_type = self._detect_document_type(raw_text, expected_type)
        logger.info("document_type_detected", doc_type=doc_type.value)

        # Step 3: Extract structured data using Mistral
        structured_data = await self._ocr.extract_structured_data(raw_text, "invoice")

        # Step 4: Parse line items
        line_items = self._parse_line_items(structured_data)

        # Step 5: Calculate confidence
        overall_confidence = self._calculate_confidence(structured_data, line_items)

        result = InvoiceExtractionResult(
            doc_type=doc_type,
            doc_number=structured_data.get("doc_number"),
            doc_date=structured_data.get("doc_date"),
            due_date=structured_data.get("due_date"),
            counterparty=structured_data.get("counterparty"),
            counterparty_address=structured_data.get("counterparty_address"),
            amount=float(structured_data.get("amount", 0)),
            subtotal=structured_data.get("subtotal"),
            tax_amount=structured_data.get("tax_amount"),
            tax_number=structured_data.get("tax_number"),
            currency=structured_data.get("currency", "MYR"),
            line_items=line_items,
            payment_method=structured_data.get("payment_method"),
            bank_details=structured_data.get("bank_details"),
            overall_confidence=overall_confidence,
            raw_text=raw_text,
            warnings=self._collect_warnings(structured_data, line_items),
        )

        logger.info(
            "invoice_extraction_complete",
            doc_type=doc_type.value,
            amount=result.amount,
            line_item_count=len(line_items),
            confidence=overall_confidence,
        )

        return result

    def _detect_document_type(self, text: str, expected_type: str) -> DocumentType:
        """
        Detect the document type from OCR text using keyword matching.

        Analyzes the extracted text for keywords specific to each document
        type and returns the type with the highest match score.

        Args:
            text: OCR-extracted text from the document
            expected_type: Hint for expected type ("invoice" or "receipt")

        Returns:
            Detected DocumentType enum value

        Note:
            Falls back to expected_type or UNKNOWN if no keywords match.
            Keywords are case-insensitive.
        """
        text_lower = text.lower()

        # Keywords for each document type
        type_keywords = {
            DocumentType.SALES_INVOICE: [
                "tax invoice",
                "invoice",
                "bill to",
                "customer",
            ],
            DocumentType.PURCHASE_INVOICE: [
                "purchase order",
                "supplier invoice",
                "vendor",
                "bill from",
            ],
            DocumentType.RECEIPT: [
                "receipt",
                "payment received",
                "paid",
                "thank you for your payment",
            ],
            DocumentType.POS_REPORT: [
                "daily sales",
                "pos report",
                "settlement report",
                "terminal report",
            ],
            DocumentType.SETTLEMENT: [
                "settlement",
                "bank settlement",
                "merchant settlement",
            ],
        }

        # Score each type
        scores = {}
        for doc_type, keywords in type_keywords.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            scores[doc_type] = score

        # Get highest scoring type
        best_type = max(scores, key=scores.get)
        if scores[best_type] > 0:
            return best_type

        # Fall back to expected type or unknown
        if expected_type == "invoice":
            return DocumentType.SALES_INVOICE
        elif expected_type == "receipt":
            return DocumentType.RECEIPT
        return DocumentType.UNKNOWN

    def _parse_line_items(self, structured_data: dict) -> list[InvoiceLineItem]:
        """
        Parse line items from LLM-extracted structured data.

        Converts raw line item dictionaries into validated InvoiceLineItem
        models, skipping any items that fail validation.

        Args:
            structured_data: Dictionary from LLM extraction containing line_items

        Returns:
            List of validated InvoiceLineItem objects

        Note:
            Invalid items are logged and skipped rather than raising errors.
        """
        line_items = []

        raw_items = structured_data.get("line_items", [])
        for item in raw_items:
            try:
                line_item = InvoiceLineItem(
                    description=item.get("description", ""),
                    quantity=item.get("quantity"),
                    unit_price=item.get("unit_price"),
                    amount=float(item.get("amount", 0)),
                    tax_amount=item.get("tax_amount"),
                )
                line_items.append(line_item)
            except (ValueError, KeyError) as e:
                logger.warning("skipping_invalid_line_item", error=str(e), item=item)
                continue

        return line_items

    def _calculate_confidence(
        self,
        structured_data: dict,
        line_items: list[InvoiceLineItem],
    ) -> float:
        """
        Calculate overall extraction confidence score.

        Scores are based on presence of key fields and data consistency:
            - Document number: +15%
            - Document date: +15%
            - Counterparty: +10%
            - Total amount: +20%
            - Line items present: +20%
            - Line items match total (within 5%): +10%
            - No extraction errors: +10%

        Args:
            structured_data: Dictionary of extracted fields
            line_items: List of parsed line items

        Returns:
            Confidence score between 0.0 and 1.0
        """
        factors = []

        # Has document number
        if structured_data.get("doc_number"):
            factors.append(0.15)

        # Has document date
        if structured_data.get("doc_date"):
            factors.append(0.15)

        # Has counterparty
        if structured_data.get("counterparty"):
            factors.append(0.1)

        # Has amount
        if structured_data.get("amount"):
            factors.append(0.2)

        # Has line items
        if line_items:
            factors.append(0.2)
            # Line items sum matches total
            items_total = sum(item.amount for item in line_items)
            total = float(structured_data.get("amount", 0))
            if total > 0 and abs(items_total - total) / total < 0.05:
                factors.append(0.1)

        # No errors
        if "error" not in structured_data:
            factors.append(0.1)

        return min(sum(factors), 1.0)

    def _collect_warnings(
        self,
        structured_data: dict,
        line_items: list[InvoiceLineItem],
    ) -> list[str]:
        """
        Collect warnings about potential extraction issues.

        Checks for common issues that may require manual review:
            - Extraction errors from LLM
            - Missing document number
            - Missing document date
            - Missing total amount
            - Missing counterparty
            - Line items total mismatch (>5% variance)

        Args:
            structured_data: Dictionary of extracted fields
            line_items: List of parsed line items

        Returns:
            List of warning message strings
        """
        warnings = []

        if "error" in structured_data:
            warnings.append(f"Structured extraction failed: {structured_data['error']}")

        if not structured_data.get("doc_number"):
            warnings.append("Document number not detected")

        if not structured_data.get("doc_date"):
            warnings.append("Document date not detected")

        if not structured_data.get("amount"):
            warnings.append("Total amount not detected")

        if not structured_data.get("counterparty"):
            warnings.append("Counterparty not detected")

        # Check if line items sum matches total
        if line_items and structured_data.get("amount"):
            items_total = sum(item.amount for item in line_items)
            total = float(structured_data.get("amount", 0))
            if total > 0:
                diff_pct = abs(items_total - total) / total
                if diff_pct > 0.05:
                    warnings.append(
                        f"Line items total ({items_total}) differs from document total ({total})"
                    )

        return warnings
