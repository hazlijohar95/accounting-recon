"""
Base Parser Interface for Document Parsing.

This module defines the abstract base class for all document parsers.
Implementations should handle specific document types (bank statements,
invoices, etc.) with type detection and structured data extraction.

Interface Contract:
    - parse(): Extract structured data from OCR text
    - detect_type(): Identify specific document format/type

Example Implementation:
    >>> class MyBankParser(BaseParser):
    ...     def parse(self, text: str) -> dict:
    ...         return {"transactions": [...]}
    ...     def detect_type(self, text: str) -> str:
    ...         return "my_bank_statement"
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseParser(ABC):
    """
    Abstract base class for document parsers.

    Defines the interface for all document parsing implementations.
    Subclasses must implement both parse() and detect_type() methods.

    This class uses Python's ABC (Abstract Base Class) to enforce
    implementation of required methods in subclasses.

    Example:
        >>> class InvoiceParser(BaseParser):
        ...     def parse(self, text: str) -> dict:
        ...         # Extract invoice fields
        ...         return {"invoice_number": "...", "amount": 100.0}
        ...
        ...     def detect_type(self, text: str) -> str:
        ...         if "sales invoice" in text.lower():
        ...             return "sales_invoice"
        ...         return "unknown"
    """

    @abstractmethod
    def parse(self, text: str) -> dict[str, Any]:
        """
        Parse text and extract structured data

        Args:
            text: OCR-extracted text

        Returns:
            Dictionary of extracted data
        """
        pass

    @abstractmethod
    def detect_type(self, text: str) -> str:
        """
        Detect the specific type/format of the document

        Args:
            text: OCR-extracted text

        Returns:
            Type identifier string
        """
        pass
