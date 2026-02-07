# Backend - Convex (Serverless)

Convex is the primary backend for Reconciled. All data, business logic, matching engine, extraction orchestration, auth checks, and cron jobs live here.

## Module Listing

| Module | Purpose |
|--------|---------|
| `schema.ts` | Database schema (30+ tables) |
| `companies.ts` | Company CRUD, onboarding |
| `transactions.ts` | Bank transaction CRUD, import |
| `accrualDocuments.ts` | Invoice/receipt records |
| `sessions.ts` | Reconciliation session management |
| `matches.ts` | Match approval, rejection, manual matching |
| `suspenseItems.ts` | Unmatched item management |
| `documents.ts` | File upload, storage, status tracking |
| `extraction.ts` | Extraction orchestration (triggers OCR) |
| `nativePdfExtraction.ts` | Bedrock Vision PDF extraction |
| `geminiExtraction.ts` | Vertex AI Gemini extraction |
| `cloudinaryExtraction.ts` | Cloudinary-based extraction |
| `extractionQueue.ts` | Batch extraction queue (50+ docs) |
| `uploadAnalysis.ts` | AI document classification |
| `users.ts` | User management |
| `onboarding.ts` | Multi-step onboarding flow |
| `settings.ts` | User/company settings |
| `categories.ts` | Transaction categorization keywords |
| `analytics.ts` | Dashboard stats and aggregations |
| `reconciliationChat.ts` | AI chat message persistence (24h retention) |
| `errors.ts` | Self-hosted error monitoring |
| `agents.ts` | Spreadsheet enrichment agent jobs |
| `workspaces.ts` | Agentic spreadsheet workspaces |
| `worksheetColumns.ts` | Spreadsheet column definitions |
| `worksheetCharts.ts` | Spreadsheet chart configs |
| `worksheetChat.ts` | Spreadsheet AI chat |
| `worksheetDataSources.ts` | Spreadsheet data source links |
| `worksheetConditionalFormats.ts` | Conditional formatting rules |
| `import.ts` | Data import utilities |
| `auth.ts` | WorkOS AuthKit provider config |
| `http.ts` | HTTP actions (webhooks) |
| `crons.ts` | Scheduled jobs |
| `convex.config.ts` | Convex deployment config |

### Library Modules (`convex/lib/`)

| Module | Purpose |
|--------|---------|
| `auth.ts` | Auth helpers: `requireAuth`, `requireCompanyAccess`, `requireSessionAccess`, etc. |
| `validators.ts` | Reusable Convex validator objects |
| `errors.ts` | Typed error classes: `AuthErrors`, `ResourceErrors`, `PermissionErrors`, `ValidationErrors` |
| `auditLogger.ts` | Structured audit trail logging |
| `extractionLogger.ts` | Extraction-specific logging |
| `matchingLogger.ts` | Matching engine logging |
| `extractionUtils.ts` | Extraction utility functions |
| `analysisUtils.ts` | Upload analysis utilities |
| `vertexAuth.ts` | Vertex AI (Gemini) authentication |

## Matching Engine

Located in `convex/matching/`. The matching engine runs as a Convex action (`runMatchingEngine`) that orchestrates all layers.

### Architecture

```
convex/matching/
├── engine.ts          # Main orchestrator (action + internal mutations)
├── layers/
│   ├── index.ts       # Re-exports, runNonLLMLayers(), formatForLLM()
│   ├── types.ts       # MatchCandidate, MatchingConfig, CashTransaction, AccrualDocument
│   ├── exact.ts       # Layer 1: Exact amount (±0.01) + date (±3 days)
│   ├── window.ts      # Layer 2: Exact amount (±0.01) + date (±7 days)
│   ├── reference.ts   # Layer 3: Invoice/reference number matching
│   ├── fuzzy.ts       # Layer 4: Levenshtein similarity + amount variance (±10%)
│   ├── semantic.ts    # Layer 5: AWS Bedrock LLM semantic matching
│   └── partial.ts     # Layer 7: One-to-many partial matching
└── __tests__/
    ├── layers.test.ts # Layer unit tests
    └── partial.test.ts # Partial matching tests
```

### Layer Execution Flow

1. **Load data** -- query unmatched cash transactions and accrual documents for the session
2. **Layers 1-4** -- `runNonLLMLayers()` runs all rule-based layers in sequence; each layer consumes matched items so they aren't re-matched
3. **Persist L1-4** -- `createMatchedPair` internal mutation for each match
4. **Layer 5 (optional)** -- `runLLMMatching` action calls AWS Bedrock; falls back to smart heuristic if Bedrock fails
5. **Layer 7 (partial)** -- `findPartialMatchCombination` tries to match one cash txn to multiple accrual docs
6. **Suspense** -- remaining unmatched items become suspense items
7. **Session update** -- final stats written to session record

### Confidence Scoring

| Layer | Confidence Range | Auto-Approve? |
|-------|-----------------|---------------|
| 1 (Exact) | 100% | Yes |
| 2 (Window) | 88-95% | Yes (if >=90%) |
| 3 (Reference) | 85-95% | No |
| 4 (Fuzzy) | 70-85% | No |
| 5 (Semantic) | 70-100% | No |
| 7 (Partial) | 70-95% | No (always needs review) |

### Key Design Decisions

- **Layers 1-4 are pure TypeScript functions** -- no I/O, deterministic, testable
- **Layer 5 is a Convex action** -- calls external Bedrock API
- **Race condition protection** -- `createMatchedPair` re-reads items before writing to prevent double-matching
- **Auto-approve** -- only Layer 1-2 high-confidence matches are auto-approved; everything else goes to "pending" for user review

## Extraction Pipeline

Three extraction paths, chosen based on document type and configuration:

### 1. Native Bedrock Vision (`nativePdfExtraction.ts`)
- Converts PDF pages to images (browser-side via PDF.js)
- Sends images to AWS Bedrock Vision (Claude) for extraction
- Streams results page-by-page with progress updates
- Primary path for most documents

### 2. Gemini Extraction (`geminiExtraction.ts`)
- Uses Vertex AI Gemini for document understanding
- Alternative to Bedrock for certain document types
- Auth via service account (`vertexAuth.ts`)

### 3. Python ML Service (`extraction.ts`)
- Calls Python FastAPI service (Fly.io) for Mistral OCR
- Includes Malaysian bank-specific regex parsers as fallback
- Results returned via webhook to Convex HTTP endpoint

### Extraction Queue (`extractionQueue.ts`)
- Batch processing for 50+ documents
- Priority-based queue with DLQ (dead letter queue)
- Retry logic with exponential backoff
- Cron job picks up pending items

## Cron Jobs (`crons.ts`)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `cleanup-old-errors` | Daily 3AM UTC | Delete errors older than 30 days |
| `process-enrichment-jobs` | Every 10 seconds | Process spreadsheet agent jobs |
| `cleanup-stale-pdf-jobs` | Every 1 minute | Mark stuck PDF jobs as failed |
| `cleanup-expired-chat` | Every 1 hour | Delete chat messages older than 24h |

## Auth Patterns (`convex/lib/auth.ts`)

### For Queries (graceful)
```typescript
const { allowed, user } = await verifyQueryCompanyAccess(ctx, companyId, workosUserId);
if (!allowed) return []; // Return empty, don't throw
```

### For Mutations (strict)
```typescript
const { user, company } = await requireCompanyAccess(ctx, companyId, workosUserId);
// Throws ConvexError if unauthorized
```

### Auth Flow
1. Try WorkOS AuthKit JWT verification (primary)
2. If AuthKit fails + `workosUserId` provided: database lookup fallback
3. Look up user by `workosId` in users table
4. Spoofing protection: if both AuthKit and `workosUserId` present, they must match

### Available Access Helpers
- `requireAuth(ctx)` -- get authenticated user or throw
- `requireCompanyAccess(ctx, companyId)` -- verify user owns company
- `requireSessionAccess(ctx, sessionId)` -- verify user owns session's company
- `requireTransactionAccess(ctx, transactionId)` -- verify ownership chain
- `requireDocumentAccess(ctx, documentId)` -- verify ownership chain
- `requireMatchAccess(ctx, matchId)` -- verify ownership chain
- `requireWorksheetAccess(ctx, worksheetId)` -- verify ownership via workspace -> company
- `requireAccrualDocAccess(ctx, docId)` -- verify ownership chain
- `requireSuspenseItemAccess(ctx, itemId)` -- verify ownership chain

## Internal vs Public Functions

- **`query`/`mutation`/`action`** -- public, callable from frontend
- **`internalQuery`/`internalMutation`** -- only callable from other Convex functions (server-to-server)
- The matching engine uses internal functions for database writes, public action as the entry point

## Audit Logging (`convex/lib/auditLogger.ts`)

All sensitive operations are logged to the `auditLog` table:
- Document upload/delete
- Extraction start/complete/fail
- Match create/approve/reject
- Session lifecycle
- Settings changes
- Queue operations

Each entry includes: `companyId`, `userId`, `action`, `resourceType`, `resourceId`, `metadata`, `timestamp`.
