"""
Invoice/receipt extraction models
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Types of accrual documents"""
    SALES_INVOICE = "sales_invoice"
    PURCHASE_INVOICE = "purchase_invoice"
    POS_REPORT = "pos_report"
    SETTLEMENT = "settlement"
    RECEIPT = "receipt"
    UNKNOWN = "unknown"


class InvoiceLineItem(BaseModel):
    """Single line item on an invoice"""

    description: str = Field(..., description="Item description")
    quantity: Optional[float] = Field(None, description="Quantity")
    unit_price: Optional[float] = Field(None, description="Unit price")
    amount: float = Field(..., description="Line item amount")
    tax_amount: Optional[float] = Field(None, description="Tax amount for this item")


class InvoiceExtractionResult(BaseModel):
    """Result of invoice/receipt extraction"""

    doc_type: DocumentType = Field(..., description="Detected document type")
    doc_number: Optional[str] = Field(None, description="Invoice/receipt number")
    doc_date: Optional[str] = Field(None, description="Document date (YYYY-MM-DD)")
    due_date: Optional[str] = Field(None, description="Payment due date (YYYY-MM-DD)")
    counterparty: Optional[str] = Field(None, description="Customer/supplier name")
    counterparty_address: Optional[str] = Field(None, description="Customer/supplier address")
    amount: float = Field(..., description="Total amount")
    subtotal: Optional[float] = Field(None, description="Subtotal before tax")
    tax_amount: Optional[float] = Field(None, description="Total tax/SST amount")
    tax_number: Optional[str] = Field(None, description="Tax registration number")
    currency: str = Field(default="MYR", description="Currency code")
    line_items: list[InvoiceLineItem] = Field(
        default_factory=list,
        description="Extracted line items"
    )
    payment_method: Optional[str] = Field(None, description="Payment method if specified")
    bank_details: Optional[str] = Field(None, description="Bank details for payment")
    overall_confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Overall extraction confidence (0-1)"
    )
    raw_text: Optional[str] = Field(None, description="Full OCR text of the document")
    warnings: list[str] = Field(
        default_factory=list,
        description="Any warnings during extraction"
    )
