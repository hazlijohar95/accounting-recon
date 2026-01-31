"""
Extraction request/response models
"""

from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel, Field

from .bank_statement import BankStatementExtractionResult
from .invoice import InvoiceExtractionResult


class ExtractionStatus(str, Enum):
    """Status of extraction job"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExtractionRequest(BaseModel):
    """Request to extract data from a document"""

    document_id: str = Field(..., description="Convex document ID")
    company_id: str = Field(..., description="Convex company ID")
    storage_url: str = Field(..., description="R2 URL to download the document")
    file_name: str = Field(..., description="Original file name")
    file_type: str = Field(..., description="File extension (pdf, jpg, png)")
    document_type: str = Field(
        ...,
        description="Expected document type: bank_statement, invoice, receipt, other"
    )


class ExtractionResponse(BaseModel):
    """Response from extraction endpoint"""

    job_id: str = Field(..., description="Unique job ID for tracking")
    status: ExtractionStatus = Field(..., description="Current job status")
    message: Optional[str] = Field(None, description="Status message")


class WebhookPayload(BaseModel):
    """Payload sent to Convex webhook with extraction results"""

    document_id: str = Field(..., description="Convex document ID")
    company_id: str = Field(..., description="Convex company ID")
    job_id: str = Field(..., description="Extraction job ID")
    status: ExtractionStatus = Field(..., description="Final status")
    error_message: Optional[str] = Field(None, description="Error message if failed")

    # Results (one of these will be populated based on document type)
    bank_statement: Optional[BankStatementExtractionResult] = Field(
        None, description="Bank statement extraction results"
    )
    invoice: Optional[InvoiceExtractionResult] = Field(
        None, description="Invoice/receipt extraction results"
    )

    # Extracted data for Convex storage
    extracted_text: Optional[str] = Field(None, description="Full OCR text")
    extraction_confidence: Optional[float] = Field(
        None, description="Overall confidence 0-100"
    )
    transaction_count: Optional[int] = Field(
        None, description="Number of transactions/items extracted"
    )
