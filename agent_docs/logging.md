# Logging & Observability

## Overview

Logging is split across three tiers:
1. **Convex** -- Audit logging (`auditLog` table) + error monitoring (`errors` table)
2. **Python ML** -- structlog JSON output
3. **Frontend** -- Client-side error capture (`lib/error-monitor.ts`) -> Convex `errors` table

## Convex Audit Logging (`convex/lib/auditLogger.ts`)

All sensitive operations are logged to the `auditLog` table with structured metadata.

### Logged Actions
- Document: `document_upload`, `document_delete`
- Extraction: `extraction_start`, `extraction_complete`, `extraction_fail`, `extraction_retry`
- Matching: `match_create`, `match_approve`, `match_reject`, `match_manual`, `match_bulk_approve`, `match_bulk_reject`
- Session: `session_create`, `session_start`, `session_complete`
- Export: `export_generate`, `export_download`
- Settings: `settings_change`, `company_update`
- Queue: `queue_create`, `queue_pause`, `queue_resume`, `queue_cancel`
- Transaction: `transaction_edit`, `transaction_delete`
- Suspense: `suspense_query`, `suspense_resolve`

### Schema
```typescript
auditLog: {
  companyId: Id<"companies">,
  userId: Id<"users">,
  action: string,          // e.g., "match_approve"
  resourceType: string,    // e.g., "match"
  resourceId?: string,
  metadata?: any,          // Additional context
  timestamp: number,
  ipAddress?: string,
  userAgent?: string,
}
```

### Indexes for Querying
- `by_company_time` -- view company activity timeline
- `by_user_time` -- view user activity
- `by_resource` -- find all actions on a specific resource
- `by_company_action` -- filter by action type within company

## Self-Hosted Error Monitoring

### Client-Side (`lib/error-monitor.ts`)

Captures browser errors and sends them to Convex for monitoring.

**Error Types:**
- `uncaught` -- `window.onerror` events
- `promise` -- `unhandledrejection` events
- `boundary` -- React error boundary catches
- `api` -- fetch/API call failures
- `convex` -- Convex mutation/query errors
- `manual` -- explicitly logged errors

**Features:**
- Throttling: 1 second minimum between reports
- Rate limiting: max 10 errors per minute
- Deduplication: fingerprint-based (same error counted, not duplicated)
- Ignored patterns: ResizeObserver, script errors, library internals

**Usage:**
```typescript
// Initialize once in root component
import { initErrorMonitor } from '@/lib/error-monitor';
initErrorMonitor(convexClient);

// Log manually caught errors
import { logManualError, logApiError, logConvexError, logBoundaryError } from '@/lib/error-monitor';
logManualError(error, { context: "during matching" });
logApiError(error, "/api/chat/assistant", "POST");
logConvexError(error, "companies.create", { name: "..." });
logBoundaryError(error, errorInfo, "ReconcileView");
```

### Server-Side (`convex/errors.ts`)

Stores errors in the `errors` table with:
- Message, stack trace, error type
- URL, user agent, user ID
- Fingerprint for deduplication
- Occurrence count
- First/last seen timestamps
- Resolution status

**Cleanup:** Cron job deletes errors older than 30 days (daily at 3 AM UTC).

## Python Logging (structlog)

### Setup
```python
# In ml/main.py
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
logger.info("extraction_started", s3_path=s3_path, bank_type=bank_type)
logger.info("extraction_complete", document_id=doc_id, transaction_count=len(txns))
logger.error("extraction_failed", document_id=doc_id, error=str(e))
```

## Convex-Specific Logging

### Extraction Logger (`convex/lib/extractionLogger.ts`)
Structured logging for extraction operations with consistent field names.

### Matching Logger (`convex/lib/matchingLogger.ts`)
Structured logging for matching engine operations.

### Console Logging in Convex
Convex functions use `console.log/warn/error` which appear in the Convex dashboard logs:
```typescript
console.log(`[Layer 5] AWS Bedrock SUCCESS: ${suggestions.length} suggestions`);
console.error(`[Layer 5] AWS Bedrock FAILED: ${errorMsg}`);
console.log(`[Layer 7] Partial matching complete: ${partialMatches.length} matches created`);
```

## Key Events to Log

### Business Events
| Event | Level | Context |
|-------|-------|---------|
| Document uploaded | info | company_id, doc_type, file_size |
| Extraction started | info | document_id, extraction_path |
| Extraction complete | info | document_id, transaction_count |
| Matching started | info | session_id, company_id |
| Match found | debug | cash_txn_id, accrual_doc_id, confidence, layer |
| Matching complete | info | session_id, match_rate, matches_by_layer |
| Export generated | info | session_id, format, file_size |

### Error Events
| Event | Level | Context |
|-------|-------|---------|
| OCR failed | error | document_id, error_message |
| LLM timeout/failure | warn | batch_size, error_message |
| Invalid file format | warn | filename, detected_type |
| Auth failed | warn | endpoint, user_id |
| Rate limit exceeded | warn | user_id, action |

## Metrics to Track

### Performance
- OCR processing time per page
- Matching engine time by layer
- API route response time
- Extraction queue throughput

### Business
- Documents processed per day
- Transactions extracted per day
- Match rate by company
- LLM tokens used (Bedrock)

### Errors
- OCR failure rate
- LLM failure rate (Bedrock availability)
- Client error rate by type

## Log Aggregation

```
Convex dashboard      → Convex function logs (console.log)
Convex auditLog table → Queryable audit trail
Convex errors table   → Client + server error monitoring
Python ML (Fly.io)    → Fly.io log dashboard
```
