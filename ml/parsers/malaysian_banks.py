"""
Malaysian Bank Statement Parsers.

This module provides specialized parsing for Malaysian bank statements using
regex-based extraction. It serves as a fallback when LLM extraction fails
and provides bank-type detection from document content.

Supported Banks:
    - Maybank (Malayan Banking Berhad)
    - CIMB Bank
    - Public Bank Berhad
    - RHB Bank
    - Hong Leong Bank
    - AmBank
    - Bank Islam Malaysia Berhad
    - OCBC Bank
    - UOB (United Overseas Bank)
    - HSBC

Performance Optimizations:
    - Pre-compiled regex patterns at class level
    - Local variable caching in hot loops for faster attribute lookup
    - Generator expressions to avoid intermediate list allocations
    - LRU cache for bank type detection (128 entries)
    - __slots__ for memory efficiency

Date Formats Supported:
    - DD/MM/YYYY (most common Malaysian format)
    - DD-MM-YYYY
    - DD MMM YYYY (e.g., "01 Jan 2024")
    - DD MMM YY (e.g., "01 Jan 24")
    - YYYY-MM-DD (ISO format)

Amount Formats Supported:
    - Standard: 1,234.56
    - Negative: -1,234.56
    - Credit/Debit suffix: 1,234.56 CR or 1,234.56 DR

Example:
    >>> from parsers.malaysian_banks import MalaysianBankParser
    >>> parser = MalaysianBankParser()
    >>> bank_type = parser.detect_bank_type(ocr_text)
    >>> transactions = parser.parse_transactions(ocr_text, bank_type)
"""

import re
from typing import Optional
from functools import lru_cache
from datetime import datetime
from dateutil import parser as date_parser
import structlog

from models import BankTransaction, BankType

logger = structlog.get_logger()


class MalaysianBankParser:
    """
    Parser for Malaysian bank statements using regex extraction.

    This parser provides fallback extraction when LLM-based extraction fails.
    It uses pre-compiled regex patterns optimized for Malaysian bank statement
    formats including amount notation (CR/DR suffix) and date formats.

    The parser is optimized for performance:
        - All regex patterns are pre-compiled at class level
        - Instance uses __slots__ for memory efficiency
        - Hot loops use local variable caching
        - Bank detection uses LRU cache

    Attributes:
        BANK_PATTERNS: Pre-compiled patterns for each bank type
        DATE_PATTERNS_COMPILED: Pre-compiled date format patterns
        AMOUNT_PATTERN: Pre-compiled amount extraction pattern
        REF_PATTERNS_COMPILED: Pre-compiled reference number patterns
        ACCOUNT_PATTERNS_COMPILED: Pre-compiled account number patterns
        PERIOD_PATTERN: Pre-compiled statement period pattern
        BALANCE_PATTERNS_COMPILED: Pre-compiled balance patterns

    Example:
        >>> parser = MalaysianBankParser()
        >>> bank_type = parser.detect_bank_type(text)
        >>> print(f"Detected: {bank_type.value}")
        >>> transactions = parser.parse_transactions(text, bank_type)
    """

    # Use __slots__ for memory efficiency when many instances are created
    __slots__ = ['_date_patterns_compiled', '_bank_patterns_compiled']

    # Bank detection patterns - pre-compiled for performance
    BANK_PATTERNS = {
        BankType.MAYBANK: [
            re.compile(r"maybank", re.IGNORECASE),
            re.compile(r"malayan banking", re.IGNORECASE),
            re.compile(r"maybank2u", re.IGNORECASE),
            re.compile(r"m2u", re.IGNORECASE),
        ],
        BankType.CIMB: [
            re.compile(r"cimb", re.IGNORECASE),
            re.compile(r"cimb bank", re.IGNORECASE),
            re.compile(r"cimb islamic", re.IGNORECASE),
        ],
        BankType.PUBLIC_BANK: [
            re.compile(r"public bank", re.IGNORECASE),
            re.compile(r"pbb", re.IGNORECASE),
            re.compile(r"public islamic", re.IGNORECASE),
        ],
        BankType.RHB: [
            re.compile(r"rhb bank", re.IGNORECASE),
            re.compile(r"rhb islamic", re.IGNORECASE),
        ],
        BankType.HONG_LEONG: [
            re.compile(r"hong leong", re.IGNORECASE),
            re.compile(r"hlb", re.IGNORECASE),
            re.compile(r"hong leong bank", re.IGNORECASE),
        ],
        BankType.AMBANK: [
            re.compile(r"ambank", re.IGNORECASE),
            re.compile(r"am bank", re.IGNORECASE),
            re.compile(r"amislamic", re.IGNORECASE),
        ],
        BankType.BANK_ISLAM: [
            re.compile(r"bank islam", re.IGNORECASE),
            re.compile(r"bimb", re.IGNORECASE),
        ],
        BankType.OCBC: [
            re.compile(r"ocbc", re.IGNORECASE),
            re.compile(r"ocbc bank", re.IGNORECASE),
        ],
        BankType.UOB: [
            re.compile(r"uob", re.IGNORECASE),
            re.compile(r"united overseas bank", re.IGNORECASE),
        ],
        BankType.HSBC: [
            re.compile(r"hsbc", re.IGNORECASE),
            re.compile(r"hongkong and shanghai", re.IGNORECASE),
        ],
    }

    # Malaysian date formats - pre-compiled patterns
    DATE_PATTERNS_COMPILED = [
        re.compile(r"\d{2}/\d{2}/\d{4}"),  # DD/MM/YYYY
        re.compile(r"\d{2}-\d{2}-\d{4}"),  # DD-MM-YYYY
        re.compile(r"\d{2}\s+\w{3}\s+\d{4}"),  # DD MMM YYYY
        re.compile(r"\d{2}\s+\w{3}\s+\d{2}"),  # DD MMM YY
        re.compile(r"\d{4}-\d{2}-\d{2}"),  # YYYY-MM-DD (ISO)
    ]

    # Amount patterns (Malaysian format: 1,234.56 or -1,234.56 or 1,234.56CR/DR)
    # Pre-compiled at class level
    AMOUNT_PATTERN = re.compile(
        r"(-?)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(CR|DR)?",
        re.IGNORECASE,
    )

    # Reference patterns - pre-compiled
    # Require delimiter (:-#) or digit after prefix to avoid matching words like "Invoice"
    REF_PATTERNS_COMPILED = [
        re.compile(r"\bREF[:\-#\s]+([A-Z0-9]+)", re.IGNORECASE),
        re.compile(r"\bTXN[:\-#\s]+([A-Z0-9]+)", re.IGNORECASE),
        re.compile(r"\bINV[:\-#]+([A-Z0-9-]+)", re.IGNORECASE),  # Requires : or - or # after INV
        re.compile(r"#([A-Z0-9]+)"),
        re.compile(r"(\d{10,})"),  # Long number sequence
    ]

    # Account number patterns - pre-compiled
    ACCOUNT_PATTERNS_COMPILED = [
        re.compile(r"Account\s*(?:No|Number)?[:\s]*(\d[\d\s-]{8,})", re.IGNORECASE),
        re.compile(r"A/C\s*No[:\s]*(\d[\d\s-]{8,})", re.IGNORECASE),
        re.compile(r"(\d{3}[-\s]?\d{3,4}[-\s]?\d{3,4}[-\s]?\d{3,4})"),
    ]

    # Statement period pattern - pre-compiled
    PERIOD_PATTERN = re.compile(
        r"(?:Statement\s+)?Period[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        re.IGNORECASE,
    )

    # Balance patterns - pre-compiled
    BALANCE_PATTERNS_COMPILED = [
        (re.compile(r"Opening\s+Balance[:\s]*([\d,]+\.\d{2})", re.IGNORECASE), "opening_balance"),
        (re.compile(r"Closing\s+Balance[:\s]*([\d,]+\.\d{2})", re.IGNORECASE), "closing_balance"),
        (re.compile(r"Beginning\s+Balance[:\s]*([\d,]+\.\d{2})", re.IGNORECASE), "opening_balance"),
        (re.compile(r"Ending\s+Balance[:\s]*([\d,]+\.\d{2})", re.IGNORECASE), "closing_balance"),
    ]

    def __init__(self):
        """
        Initialize parser with cached pattern references.

        Stores local references to class-level compiled patterns for faster
        attribute access during parsing operations.
        """
        # Store local references for faster access in hot loops
        self._date_patterns_compiled = self.DATE_PATTERNS_COMPILED
        self._bank_patterns_compiled = self.BANK_PATTERNS

    @lru_cache(maxsize=128)
    def detect_bank_type(self, text: str) -> BankType:
        """
        Detect the bank type from statement text

        Uses lru_cache to avoid re-detection for same text.

        Args:
            text: OCR-extracted text

        Returns:
            Detected bank type
        """
        # Local variable for faster lookup in loop
        bank_patterns = self._bank_patterns_compiled

        # Search in first 2000 chars only (bank name is usually at top)
        text_sample = text[:2000].lower()

        for bank_type, patterns in bank_patterns.items():
            for pattern in patterns:
                if pattern.search(text_sample):
                    return bank_type

        return BankType.UNKNOWN

    def parse_transactions(
        self,
        text: str,
        bank_type: BankType,
    ) -> list[BankTransaction]:
        """
        Parse transactions from bank statement text using regex

        This is a fallback when LLM extraction fails.

        Args:
            text: OCR-extracted text
            bank_type: Detected bank type

        Returns:
            List of parsed transactions
        """
        logger.info("regex_parsing_transactions", bank_type=bank_type.value)

        # Select parser based on bank type
        # All parsers now use optimized _parse_lines
        if bank_type == BankType.MAYBANK:
            return self._parse_lines(text, "maybank")
        elif bank_type == BankType.CIMB:
            return self._parse_lines(text, "cimb")
        elif bank_type == BankType.PUBLIC_BANK:
            return self._parse_lines(text, "public_bank")
        else:
            return self._parse_lines(text, "generic")

    def _parse_lines(self, text: str, bank_format: str) -> list[BankTransaction]:
        """
        Parse transaction lines using optimized regex matching.

        Processes each line of the statement text, attempting to extract
        date, amount, description, and reference number using pre-compiled
        patterns with local variable caching for performance.

        Args:
            text: Full statement text from OCR
            bank_format: Bank format identifier (maybank, cimb, public_bank, generic)

        Returns:
            List of BankTransaction objects with confidence 0.6 (regex-based)

        Algorithm:
            1. Split text into lines, skip short/empty lines
            2. Find date using multiple format patterns
            3. Find amount using pattern with CR/DR suffix support
            4. Extract description by removing date and amount patterns
            5. Search for reference numbers in description

        Note:
            Transactions without both date and amount are skipped.
            Last amount in line is preferred (usually the transaction amount).
        """
        # Local variable references for hot loop (faster than attribute lookup)
        date_patterns = self._date_patterns_compiled
        amount_pattern = self.AMOUNT_PATTERN
        ref_patterns = self.REF_PATTERNS_COMPILED

        transactions = []

        # Use generator to avoid creating intermediate list
        for line in text.split("\n"):
            # Skip empty lines and headers early (short-circuit)
            stripped = line.strip()
            if not stripped or len(stripped) < 10:
                continue

            # Try to find a date using local reference
            date_str = None
            for pattern in date_patterns:
                match = pattern.search(line)
                if match:
                    date_match = match.group()
                    try:
                        # SECURITY: Disable fuzzy parsing to prevent incorrect date matches
                        # Fuzzy parsing can misinterpret random numbers as dates
                        parsed = date_parser.parse(date_match, dayfirst=True, fuzzy=False)
                        date_str = parsed.strftime("%Y-%m-%d")
                        break
                    except (ValueError, TypeError):
                        continue

            if not date_str:
                continue

            # Try to find an amount using local reference
            matches = amount_pattern.findall(line)
            if not matches:
                continue

            amount = None
            # Iterate in reverse (last amount is usually the transaction amount)
            for sign, number, cr_dr in reversed(matches):
                try:
                    amount = float(number.replace(",", ""))
                    if sign == "-" or (cr_dr and cr_dr.upper() == "DR"):
                        amount = -amount
                    break
                except ValueError:
                    continue

            if amount is None:
                continue

            # Extract reference FIRST from original line (before removing amounts)
            # This prevents amount removal from destroying reference numbers like "ABC123"
            reference = None
            for pattern in ref_patterns:
                match = pattern.search(line)
                if match:
                    reference = match.group(1)
                    break

            # Then extract description (remove date and amounts) for display
            description = line
            for pattern in date_patterns:
                description = pattern.sub("", description)
            description = amount_pattern.sub("", description)
            description = " ".join(description.split()) or "Unknown transaction"

            transactions.append(BankTransaction(
                date=date_str,
                description=description,
                reference=reference,
                amount=amount,
                confidence=0.6,
                raw_text=line,
            ))

        return transactions

    def parse_statement_metadata(self, text: str) -> dict:
        """
        Extract statement metadata from header section.

        Searches the first 3000 characters for account information
        and statement details. Uses pre-compiled patterns for performance.

        Args:
            text: Full statement text from OCR

        Returns:
            Dictionary containing (all optional):
                - account_number: Bank account number
                - period_start: Statement start date (YYYY-MM-DD)
                - period_end: Statement end date (YYYY-MM-DD)
                - opening_balance: Opening balance amount
                - closing_balance: Closing balance amount

        Note:
            Missing fields are not included in the returned dictionary.
            Date parsing uses dayfirst=True for Malaysian formats.
        """
        metadata = {}

        # Use local references for faster access
        account_patterns = self.ACCOUNT_PATTERNS_COMPILED
        period_pattern = self.PERIOD_PATTERN
        balance_patterns = self.BALANCE_PATTERNS_COMPILED

        # Account number - search only first part of document
        text_header = text[:3000]
        for pattern in account_patterns:
            match = pattern.search(text_header)
            if match:
                metadata["account_number"] = match.group(1).strip()
                break

        # Statement period
        match = period_pattern.search(text_header)
        if match:
            try:
                start = date_parser.parse(match.group(1), dayfirst=True)
                end = date_parser.parse(match.group(2), dayfirst=True)
                metadata["period_start"] = start.strftime("%Y-%m-%d")
                metadata["period_end"] = end.strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                pass

        # Opening/closing balance
        for pattern, key in balance_patterns:
            match = pattern.search(text)
            if match:
                try:
                    metadata[key] = float(match.group(1).replace(",", ""))
                except ValueError:
                    pass

        return metadata

    def clear_cache(self) -> None:
        """
        Clear the LRU cache for bank type detection.

        Useful for testing when the same text needs to return different
        results, or to free memory after processing many documents.
        """
        self.detect_bank_type.cache_clear()
