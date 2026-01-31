# Logging & Observability

## Structured Logging Format

All services use JSON structured logging:

```json
{
  "timestamp": "2025-01-29T10:30:45.123Z",
  "level": "info",
  "service": "rust-api",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Document uploaded",
  "context": {
    "company_id": "xyz",
    "document_id": "doc123",
    "file_size_bytes": 1048576
  }
}
```

## Rust Logging

### Setup (tracing)
```rust
// In main.rs
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn init_logging() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().json())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();
}
```

### Usage
```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(state), fields(company_id = %args.company_id))]
pub async fn upload_document(
    State(state): State<AppState>,
    args: UploadArgs,
) -> Result<Json<Response>, AppError> {
    info!(file_name = %args.filename, "Starting upload");

    let result = process_file(&args.file).await;

    match &result {
        Ok(doc) => info!(document_id = %doc.id, "Upload complete"),
        Err(e) => error!(error = %e, "Upload failed"),
    }

    result
}
```

### Log Levels
- `error` - Failures requiring attention
- `warn` - Unexpected but recoverable
- `info` - Business events (uploads, matches, exports)
- `debug` - Technical details
- `trace` - Verbose debugging

## Python Logging

### Setup (structlog)
```python
# In main.py
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()
```

### Usage
```python
from structlog import get_logger

logger = get_logger()

async def extract_bank_statement(s3_path: str, bank_type: str):
    logger.info("extraction_started", s3_path=s3_path, bank_type=bank_type)

    try:
        result = await process_ocr(s3_path)
        logger.info(
            "extraction_complete",
            s3_path=s3_path,
            transaction_count=len(result.transactions)
        )
        return result
    except Exception as e:
        logger.error("extraction_failed", s3_path=s3_path, error=str(e))
        raise
```

## Request Tracing

### Trace ID Propagation
```rust
// Middleware to propagate trace ID
pub async fn trace_middleware<B>(
    request: Request<B>,
    next: Next<B>,
) -> Response {
    let trace_id = request
        .headers()
        .get("x-trace-id")
        .map(|v| v.to_str().unwrap_or_default())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let span = tracing::info_span!("request", trace_id = %trace_id);
    let _guard = span.enter();

    let mut response = next.run(request).await;
    response.headers_mut().insert("x-trace-id", trace_id.parse().unwrap());
    response
}
```

### Cross-Service Tracing
```python
# Python receiving trace ID from Rust
@app.middleware("http")
async def trace_middleware(request: Request, call_next):
    trace_id = request.headers.get("x-trace-id", str(uuid.uuid4()))
    structlog.contextvars.bind_contextvars(trace_id=trace_id)

    response = await call_next(request)
    response.headers["x-trace-id"] = trace_id
    return response
```

## Key Events to Log

### Business Events
| Event | Level | Context |
|-------|-------|---------|
| Document uploaded | info | company_id, doc_type, file_size |
| Extraction started | info | document_id, bank_type |
| Extraction complete | info | document_id, transaction_count |
| Matching started | info | session_id, company_id |
| Match found | debug | bank_txn_id, accrual_doc_id, confidence |
| Matching complete | info | session_id, match_rate |
| Export generated | info | session_id, format, file_size |

### Error Events
| Event | Level | Context |
|-------|-------|---------|
| OCR failed | error | document_id, error_message |
| LLM timeout | warn | batch_size, timeout_ms |
| Invalid file format | warn | filename, detected_type |
| Auth failed | warn | user_id, endpoint |

## Metrics to Track

### Performance
- Request latency (p50, p95, p99)
- OCR processing time per page
- Matching engine time by layer
- Export generation time

### Business
- Documents processed per day
- Transactions extracted per day
- Match rate by company
- LLM tokens used

### Errors
- OCR failure rate
- LLM timeout rate
- API error rate by endpoint

## Log Aggregation

Use CloudWatch Logs or similar:
```
rust-api -> CloudWatch Log Group: /reconciled/rust-api
python-ml -> CloudWatch Log Group: /reconciled/python-ml
```

Query example (CloudWatch Insights):
```
fields @timestamp, @message
| filter service = "rust-api" and level = "error"
| sort @timestamp desc
| limit 100
```
