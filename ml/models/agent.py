"""
Pydantic models for agent enrichment service.

Provides request/response models for:
- Single cell enrichment
- Batch column enrichment
- Webhook payloads for results
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class AgentStatus(str, Enum):
    """Status of an agent enrichment job."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class DataSource(str, Enum):
    """Available data sources for enrichment."""
    LLM = "llm"  # LLM with optional tool use
    CLEARBIT = "clearbit"  # Clearbit company enrichment
    ZOOMINFO = "zoominfo"  # ZoomInfo contact lookup
    SSM = "ssm"  # Malaysia SSM company search


class EnrichRequest(BaseModel):
    """Request for single cell enrichment."""
    job_id: str = Field(..., description="Convex job ID for tracking")
    input: str = Field(..., description="Input value to enrich")
    prompt: str = Field(..., description="Enrichment prompt/instruction")
    data_source: DataSource = Field(DataSource.LLM, description="Data source to use")
    webhook_url: str = Field(..., description="URL to send results to")


class EnrichResponse(BaseModel):
    """Response for enrichment request."""
    job_id: str
    status: AgentStatus
    message: str


class BatchEnrichRequest(BaseModel):
    """Request for batch column enrichment."""
    jobs: List[EnrichRequest] = Field(..., description="List of enrichment jobs")


class BatchEnrichResponse(BaseModel):
    """Response for batch enrichment request."""
    total: int
    queued: int
    message: str


class AgentWebhookPayload(BaseModel):
    """Webhook payload for enrichment results."""
    job_id: str = Field(..., description="Convex job ID")
    status: str = Field(..., description="completed or failed")
    result: Optional[str] = Field(None, description="Enrichment result value")
    error: Optional[str] = Field(None, description="Error message if failed")


class ClearbitCompanyResponse(BaseModel):
    """Structured response from Clearbit company enrichment."""
    name: Optional[str] = None
    legal_name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    founded_year: Optional[int] = None
    location: Optional[str] = None
    employees: Optional[int] = None
    industry: Optional[str] = None
    tags: Optional[List[str]] = None
    tech: Optional[List[str]] = None
    ceo_name: Optional[str] = None
    linkedin_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    facebook_handle: Optional[str] = None


class ToolResult(BaseModel):
    """Result from a tool call."""
    tool_name: str
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
