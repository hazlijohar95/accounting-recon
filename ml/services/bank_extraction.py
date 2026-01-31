"""
Bank Statement Extraction Service.

This module orchestrates the extraction of structured transaction data from
bank statements. It combines OCR extraction with Malaysian bank-specific
parsing rules and intelligent fallback mechanisms.

Architecture:
    - Primary extraction: Mistral LLM for structured JSON output
    - Fallback extraction: Regex-based parsing via MalaysianBankParser
    - Automatic bank type detection from document content
    - Confidence scoring based on extraction completeness

Supported Banks (Malaysian):
    - Maybank
    - CIMB
    - Public Bank
    - RHB
    - Hong Leong Bank
    - AmBank
    - Bank Islam
    - OCBC
    - UOB
    - HSBC

Example:
    >>> from services.ocr import OCRService
    >>> from services.bank_extraction import BankExtractionService
    >>> ocr = OCRService()
    >>> extractor = BankExtractionService(ocr)
    >>> result = await extractor.extract(pdf_bytes, "pdf")
    >>> print(f"Found {len(result.transactions)} transactions")
"""

import re
from typing import Optional
import structlog

from models import (
    BankTransaction,
    BankStatementExtractionResult,
    BankType,
)
from .ocr import OCRService
from parsers.malaysian_banks import MalaysianBankParser

logger = structlog.get_logger()


class BankExtractionService:
    """
    Service for extracting structured data from bank statements.

    Orchestrates the full extraction pipeline: OCR → bank detection →
    structured parsing → fallback regex → confidence calculation.

    The service uses a two-tier extraction approach:
    1. Primary: LLM-based structured extraction for high accuracy
    2. Fallback: Regex-based parsing when LLM fails

    Attributes:
        _ocr: OCRService instance for text and structured data extraction
        _parser: MalaysianBankParser for regex-based fallback extraction

    Example:
        >>> service = BankExtractionService(OCRService())
        >>> with open("statement.pdf", "rb") as f:
        ...     result = await service.extract(f.read(), "pdf")
        >>> for tx in result.transactions:
        ...     print(f"{tx.date}: {tx.amount}")
    """

    def __init__(self, ocr_service: OCRService):
        """
        Initialize the bank extraction service.

        Args:
            ocr_service: Configured OCRService instance for text extraction
        """
        self._ocr = ocr_service
        self._parser = MalaysianBankParser()

    async def extract(
        self,
        file_content: bytes,
        file_type: str,
    ) -> BankStatementExtractionResult:
        """
        Extract transactions from a bank statement

        Args:
            file_content: PDF or image bytes
            file_type: File type (pdf, jpg, png)

        Returns:
            Extraction result with transactions
        """
        logger.info("starting_bank_extraction", file_type=file_type)

        # Step 1: OCR the document
        raw_text = await self._ocr.extract_text(file_content, file_type)
        logger.info("ocr_complete", text_length=len(raw_text))

        # Step 2: Detect bank type
        bank_type = self._parser.detect_bank_type(raw_text)
        logger.info("bank_detected", bank_type=bank_type.value)

        # Step 3: Extract structured data using Mistral
        structured_data = await self._ocr.extract_structured_data(
            raw_text, "bank_statement"
        )

        # Step 4: Parse transactions using bank-specific parser
        if "error" not in structured_data:
            transactions = self._parse_transactions(structured_data, bank_type)
        else:
            # Fall back to regex-based parsing
            logger.warning("falling_back_to_regex_parsing")
            transactions = self._parser.parse_transactions(raw_text, bank_type)

        # Step 5: Calculate confidence
        overall_confidence = self._calculate_confidence(transactions, structured_data)

        result = BankStatementExtractionResult(
            bank_type=bank_type,
            account_number=structured_data.get("account_number"),
            account_holder=structured_data.get("account_holder"),
            period_start=structured_data.get("period_start"),
            period_end=structured_data.get("period_end"),
            opening_balance=structured_data.get("opening_balance"),
            closing_balance=structured_data.get("closing_balance"),
            currency=structured_data.get("currency", "MYR"),
            transactions=transactions,
            overall_confidence=overall_confidence,
            raw_text=raw_text,
            warnings=self._collect_warnings(structured_data, transactions),
        )

        logger.info(
            "bank_extraction_complete",
            bank_type=bank_type.value,
            transaction_count=len(transactions),
            confidence=overall_confidence,
        )

        return result

    def _parse_transactions(
        self,
        structured_data: dict,
        bank_type: BankType,
    ) -> list[BankTransaction]:
        """
        Parse transactions from LLM-extracted structured data.

        Converts raw transaction dictionaries into validated BankTransaction
        models. LLM-extracted transactions receive high confidence (0.9).

        Args:
            structured_data: Dictionary from LLM extraction containing transactions
            bank_type: Detected bank type (for future bank-specific handling)

        Returns:
            List of validated BankTransaction objects

        Note:
            Invalid transactions are logged and skipped rather than raising errors.
        """
        transactions = []

        raw_transactions = structured_data.get("transactions", [])
        for tx in raw_transactions:
            try:
                # Skip transactions missing required fields
                if not tx.get("date") or not tx.get("description") or "amount" not in tx:
                    logger.warning("skipping_invalid_transaction", reason="missing required fields", tx=tx)
                    continue

                transaction = BankTransaction(
                    date=tx.get("date", ""),
                    description=tx.get("description", ""),
                    reference=tx.get("reference"),
                    amount=float(tx.get("amount", 0)),
                    balance=tx.get("balance"),
                    confidence=0.9,  # High confidence from LLM extraction
                )
                transactions.append(transaction)
            except (ValueError, KeyError) as e:
                logger.warning("skipping_invalid_transaction", error=str(e), tx=tx)
                continue

        return transactions

    def _calculate_confidence(
        self,
        transactions: list[BankTransaction],
        structured_data: dict,
    ) -> float:
        """
        Calculate overall extraction confidence

        Optimized: Uses local variables and avoids repeated dict lookups
        """
        if not transactions:
            return 0.5  # Low confidence if no transactions found

        # Pre-fetch structured data values (avoid repeated dict.get calls)
        has_account = bool(structured_data.get("account_number"))
        has_period = bool(structured_data.get("period_start") and structured_data.get("period_end"))
        has_balance = bool(structured_data.get("opening_balance") and structured_data.get("closing_balance"))
        has_error = "error" in structured_data

        # Calculate confidence score directly (avoid list allocation)
        confidence = 0.0

        # Has account number
        if has_account:
            confidence += 0.1

        # Has period dates
        if has_period:
            confidence += 0.1

        # Has opening/closing balance
        if has_balance:
            confidence += 0.1

        # Average transaction confidence (use generator to avoid intermediate list)
        tx_count = len(transactions)
        avg_tx_confidence = sum(tx.confidence for tx in transactions) / tx_count
        confidence += avg_tx_confidence * 0.5

        # Reasonable number of transactions
        if 5 <= tx_count <= 200:
            confidence += 0.1
        elif tx_count > 0:
            confidence += 0.05

        # No errors in structured data
        if not has_error:
            confidence += 0.1

        return min(confidence, 1.0)

    def _collect_warnings(
        self,
        structured_data: dict,
        transactions: list[BankTransaction],
    ) -> list[str]:
        """
        Collect warnings about the extraction

        Optimized: Uses generator expression for low-confidence count
        """
        warnings = []

        # Pre-fetch values to avoid repeated dict lookups
        error_msg = structured_data.get("error")
        account_number = structured_data.get("account_number")
        period_start = structured_data.get("period_start")
        period_end = structured_data.get("period_end")

        if error_msg:
            warnings.append(f"Structured extraction failed: {error_msg}")

        if not transactions:
            warnings.append("No transactions could be extracted")

        if not account_number:
            warnings.append("Account number not detected")

        if not period_start or not period_end:
            warnings.append("Statement period not detected")

        # Check for low-confidence transactions using generator (no intermediate list)
        low_conf_count = sum(1 for tx in transactions if tx.confidence < 0.7)
        if low_conf_count > 0:
            warnings.append(f"{low_conf_count} transactions have low confidence")

        return warnings
