# Backend - Python (FastAPI)

## Project Structure
```
ml/
├── main.py                  # FastAPI app, routes, lifespan manager
├── config.py                # Pydantic Settings for env vars
├── services/
│   ├── __init__.py
│   ├── ocr.py               # Mistral OCR integration (Pixtral-12b)
│   ├── invoice_extraction.py # Invoice/receipt extraction pipeline
│   ├── bank_extraction.py   # Bank statement extraction pipeline
│   ├── pdf_generator.py     # ReportLab PDF report generation
│   ├── pdf_styles.py        # Brand styling constants and functions
│   ├── storage.py           # Cloudflare R2 storage client
│   └── convex_client.py     # Webhook notifications to Convex
├── models/
│   ├── __init__.py
│   ├── bank_statement.py    # BankTransaction, BankStatementExtractionResult
│   ├── invoice.py           # InvoiceExtractionResult, DocumentType
│   ├── pdf_report.py        # PDFGenerationRequest, report data models
│   └── extraction.py        # Shared extraction types
├── parsers/
│   ├── __init__.py
│   ├── base.py              # BaseParser abstract class
│   └── malaysian_banks.py   # Malaysian bank statement parsers (regex)
├── assets/
│   └── fonts/               # Inter font family for PDF generation
└── requirements.txt
```

## API Endpoints

### Health Check
```python
@app.get("/health")
async def health_check():
    """Service health check"""
    return {"status": "healthy", "service": "reconciled-ml"}
```

### Document Extraction (Async)
```python
@app.post("/extract", response_model=ExtractionResponse)
@limiter.limit("30/minute")  # Rate limited per IP
async def start_extraction(
    request: ExtractionRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start document extraction job.

    Downloads file from R2, runs OCR, extracts structured data.
    Results sent to Convex webhook when complete.
    """
```

### PDF Generation (Async)
```python
@app.post("/generate-pdf", response_model=PDFGenerationResponse)
@limiter.limit("10/minute")  # Rate limited per IP
async def start_pdf_generation(
    request: PDFGenerationRequest,
    background_tasks: BackgroundTasks,
):
    """
    Generate PDF reconciliation report.

    Creates branded PDF using ReportLab, uploads to R2.
    Download URL sent to Convex webhook when complete.
    """
```

## OCR Service (Mistral)

### Request Pattern
```python
# In services/ocr.py
import httpx
from mistralai.client import MistralClient

async def extract_bank_statement(s3_path: str, bank_type: str) -> list[Transaction]:
    client = MistralClient(api_key=MISTRAL_API_KEY)

    # Download from S3
    pdf_bytes = await download_from_s3(s3_path)

    # OCR with Mistral
    response = await client.ocr.process(
        file=pdf_bytes,
        model="mistral-ocr-latest"
    )

    # Parse to transactions
    return parse_transactions(response.text, bank_type)
```

### Bank-Specific Parsers
```python
BANK_PARSERS = {
    "maybank": parse_maybank,
    "cimb": parse_cimb,
    "public_bank": parse_public_bank,
    # ...
}
```

## LLM Matching Service

### AWS Bedrock Integration
```python
# In services/matching.py
import boto3

bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")

async def llm_semantic_match(
    bank_items: list[Transaction],
    accrual_items: list[AccrualDoc]
) -> list[Match]:
    prompt = MATCHING_PROMPT.format(
        bank_items=json.dumps(bank_items),
        accrual_items=json.dumps(accrual_items)
    )

    response = bedrock.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}]
        })
    )

    return parse_llm_response(response)
```

### Matching Prompt
```python
MATCHING_PROMPT = """You are an accounting reconciliation expert.
Match bank transactions to invoices/receipts based on:
- Amount similarity (exact or close)
- Date proximity (within 30 days)
- Name/description semantic similarity
- Reference number patterns

Bank Transactions:
{bank_items}

Accrual Documents:
{accrual_items}

Return JSON array of matches:
[{{"bank_id": "...", "accrual_id": "...", "confidence": 0.85, "reason": "..."}}]
"""
```

## Categorization Service

### Keyword-Based + LLM Fallback
```python
# In services/categorization.py

KEYWORDS = {
    "rent": ["landlord", "rental", "lease", "tenancy"],
    "utilities": ["tnb", "air selangor", "iwk", "tm", "unifi"],
    "salary": ["wages", "salary", "payroll", "gaji"],
    # ... 300+ keywords
}

async def categorize(transactions: list[Transaction]) -> list[CategorizedTransaction]:
    results = []
    uncategorized = []

    for txn in transactions:
        category = match_keywords(txn.description)
        if category:
            results.append(CategorizedTransaction(txn=txn, category=category, confidence=0.95))
        else:
            uncategorized.append(txn)

    # LLM fallback for uncategorized
    if uncategorized:
        llm_results = await llm_categorize(uncategorized)
        results.extend(llm_results)

    return results
```

## PDF Report Generation

### Report Types
```python
class PDFReportType(str, Enum):
    BANK_RECON = "bank_recon"       # Full reconciliation with matches
    CLIENT_QUERY = "client_query"   # Suspense items for client review
    TRANSACTION_LISTING = "transaction_listing"  # All transactions
```

### Branded Styling
The PDF generator uses a premium black & white design:
- Inter font family (Helvetica fallback)
- Geometric 'R' logo programmatically drawn
- Alternating row colors for tables
- Consistent header/footer on all pages

### Usage
```python
from services.pdf_generator import PDFGeneratorService
from models.pdf_report import PDFGenerationRequest, PDFReportType

service = PDFGeneratorService()
pdf_bytes = service.generate_report(request)
```

## Bank Statement Parsing

### Supported Banks (Malaysian)
- Maybank, CIMB, Public Bank, RHB
- Hong Leong, AmBank, Bank Islam
- OCBC, UOB, HSBC

### Two-Tier Extraction
1. **Primary**: Mistral Large for structured JSON extraction
2. **Fallback**: Regex-based parsing via MalaysianBankParser

## Dependencies (requirements.txt)
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
httpx>=0.26.0
mistralai>=1.0.0
python-multipart>=0.0.6
structlog>=24.0.0
pdf2image>=1.17.0
pillow>=10.0.0
reportlab>=4.0.0
python-dateutil>=2.8.0
slowapi>=0.1.9
```

## Error Handling
```python
# Results are sent via webhook, including errors
payload = WebhookPayload(
    document_id=request.document_id,
    job_id=job_id,
    status=ExtractionStatus.FAILED,
    error_message=str(e),
)
await convex_client.send_extraction_results(payload)
```
