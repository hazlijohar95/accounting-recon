"""
Bank statement extraction models
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from datetime import date


class BankType(str, Enum):
    """Supported Malaysian banks"""
    MAYBANK = "maybank"
    CIMB = "cimb"
    PUBLIC_BANK = "public_bank"
    RHB = "rhb"
    HONG_LEONG = "hong_leong"
    AMBANK = "ambank"
    BANK_ISLAM = "bank_islam"
    OCBC = "ocbc"
    UOB = "uob"
    HSBC = "hsbc"
    UNKNOWN = "unknown"


class BankTransaction(BaseModel):
    """Single bank transaction extracted from statement"""

    date: str = Field(..., description="Transaction date in ISO format (YYYY-MM-DD)")
    description: str = Field(..., description="Transaction description/narrative")
    reference: Optional[str] = Field(None, description="Reference number if available")
    amount: float = Field(..., description="Transaction amount (positive=credit, negative=debit)")
    balance: Optional[float] = Field(None, description="Running balance after transaction")
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for this transaction (0-1)"
    )
    raw_text: Optional[str] = Field(None, description="Original OCR text for this transaction")


class BankStatementExtractionResult(BaseModel):
    """Result of bank statement extraction"""

    bank_type: BankType = Field(..., description="Detected bank type")
    account_number: Optional[str] = Field(None, description="Bank account number")
    account_holder: Optional[str] = Field(None, description="Account holder name")
    period_start: Optional[str] = Field(None, description="Statement period start (YYYY-MM-DD)")
    period_end: Optional[str] = Field(None, description="Statement period end (YYYY-MM-DD)")
    opening_balance: Optional[float] = Field(None, description="Opening balance")
    closing_balance: Optional[float] = Field(None, description="Closing balance")
    currency: str = Field(default="MYR", description="Currency code")
    transactions: list[BankTransaction] = Field(
        default_factory=list,
        description="Extracted transactions"
    )
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
