"""
Pydantic models for PDF report generation
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class PDFReportType(str, Enum):
    """Types of PDF reports that can be generated"""
    BANK_RECON = "bank_recon"
    CLIENT_QUERY = "client_query"
    TRANSACTION_LISTING = "transaction_listing"


class PDFStatus(str, Enum):
    """Status of PDF generation job"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class CompanyInfo(BaseModel):
    """Company information for report header"""
    name: str = Field(..., description="Company name")
    currency: str = Field(default="MYR", description="Currency code")
    registration_number: Optional[str] = Field(None, description="Company registration number")


class SessionInfo(BaseModel):
    """Reconciliation session information"""
    id: str = Field(..., description="Session ID")
    name: str = Field(..., description="Session name")
    period_start: Optional[str] = Field(None, description="Period start date")
    period_end: Optional[str] = Field(None, description="Period end date")


class MatchedTransaction(BaseModel):
    """A matched transaction for the report"""
    date: str = Field(..., description="Transaction date")
    bank_description: str = Field(..., description="Bank statement description")
    bank_amount: float = Field(..., description="Bank statement amount")
    invoice_number: Optional[str] = Field(None, description="Invoice number")
    counterparty: Optional[str] = Field(None, description="Counterparty name")
    invoice_amount: Optional[float] = Field(None, description="Invoice amount")
    match_type: str = Field(..., description="Match type description")
    confidence: float = Field(..., description="Match confidence percentage")


class SuspenseItem(BaseModel):
    """A suspense item for the report"""
    date: str = Field(..., description="Transaction date")
    description: str = Field(..., description="Description")
    amount: float = Field(..., description="Amount")
    source: str = Field(..., description="Source: Bank or Accrual")
    reason: str = Field(..., description="Suspense reason")
    suggested_action: str = Field(..., description="Suggested action")
    status: str = Field(..., description="Status: open, queried, resolved")


class Transaction(BaseModel):
    """A transaction for transaction listing"""
    date: str = Field(..., description="Transaction date")
    description: str = Field(..., description="Description")
    reference: Optional[str] = Field(None, description="Reference number")
    amount: float = Field(..., description="Amount")
    type: str = Field(..., description="Transaction type: cash or accrual")
    status: str = Field(..., description="Status: pending, matched, suspense")
    category: Optional[str] = Field(None, description="Category")


class JournalEntry(BaseModel):
    """A journal entry for the report"""
    date: str = Field(..., description="Entry date")
    account: str = Field(..., description="Account name/code")
    debit: float = Field(default=0.0, description="Debit amount")
    credit: float = Field(default=0.0, description="Credit amount")
    description: str = Field(..., description="Description")
    reference: str = Field(..., description="Reference number")


class SummaryData(BaseModel):
    """Summary statistics for the report"""
    total_cash: float = Field(default=0.0, description="Total cash transactions")
    total_accrual: float = Field(default=0.0, description="Total accrual amount")
    matched_count: int = Field(default=0, description="Number of matched transactions")
    pending_count: int = Field(default=0, description="Number of pending matches")
    suspense_count: int = Field(default=0, description="Number of suspense items")
    match_rate: float = Field(default=0.0, description="Match rate percentage")
    total_cash_transactions: int = Field(default=0, description="Total bank transactions")
    total_accrual_documents: int = Field(default=0, description="Total accrual documents")


class PDFReportData(BaseModel):
    """Full data payload for PDF generation"""
    session: SessionInfo = Field(..., description="Session information")
    matches: List[MatchedTransaction] = Field(default_factory=list, description="Matched transactions")
    suspense_items: List[SuspenseItem] = Field(default_factory=list, description="Suspense items")
    transactions: List[Transaction] = Field(default_factory=list, description="All transactions")
    journal_entries: List[JournalEntry] = Field(default_factory=list, description="Journal entries")
    summary: SummaryData = Field(default_factory=SummaryData, description="Summary statistics")


class PDFReportOptions(BaseModel):
    """Options for PDF report generation"""
    include_matched: bool = Field(default=True, description="Include matched transactions")
    include_suspense: bool = Field(default=True, description="Include suspense items")
    include_journal: bool = Field(default=True, description="Include journal entries")


class PDFGenerationRequest(BaseModel):
    """Request to generate a PDF report"""
    job_id: str = Field(..., description="Unique job ID for tracking")
    report_type: PDFReportType = Field(..., description="Type of report to generate")
    company: CompanyInfo = Field(..., description="Company information")
    data: PDFReportData = Field(..., description="Report data")
    options: PDFReportOptions = Field(default_factory=PDFReportOptions, description="Generation options")
    webhook_url: str = Field(..., description="URL to call when PDF is ready")


class PDFGenerationResponse(BaseModel):
    """Response from PDF generation endpoint"""
    job_id: str = Field(..., description="Job ID for tracking")
    status: PDFStatus = Field(..., description="Current job status")
    message: Optional[str] = Field(None, description="Status message")


class PDFWebhookPayload(BaseModel):
    """Payload sent to Convex webhook when PDF is ready"""
    job_id: str = Field(..., description="Job ID")
    status: PDFStatus = Field(..., description="Final status")
    download_url: Optional[str] = Field(None, description="R2 URL to download PDF")
    file_name: Optional[str] = Field(None, description="Generated file name")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class PDFGenerationProgress(BaseModel):
    """Progress tracking for async PDF generation"""
    job_id: str = Field(..., description="Job ID being processed")
    status: PDFStatus = Field(..., description="Current status")
    progress: int = Field(default=0, ge=0, le=100, description="Progress percentage 0-100")
    current_step: str = Field(default="", description="Description of current step")
    items_processed: int = Field(default=0, description="Number of items processed so far")
    total_items: int = Field(default=0, description="Total items to process")
    estimated_remaining_seconds: Optional[int] = Field(None, description="Estimated time remaining")
