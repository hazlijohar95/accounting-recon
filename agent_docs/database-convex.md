# Database - Convex

## Schema Overview

See `convex/schema.ts` for full schema (30+ tables). Tables are grouped by domain.

### Core Reconciliation Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | User accounts (WorkOS auth) | `by_email`, `by_workos` |
| `companies` | Accountant client companies | `by_owner`, `by_name`, `by_code` |
| `documents` | Uploaded files (PDFs, CSVs) | `by_company`, `by_status`, `by_job` |
| `transactions` | Bank transactions (cash basis) | `by_company`, `by_session`, `by_type`, `by_status`, `by_date` |
| `accrualDocuments` | Invoices/receipts (accrual basis) | `by_company`, `by_session`, `by_status`, `by_date`, `by_counterparty` |
| `matchedPairs` | Reconciliation matches | `by_session`, `by_status`, `by_cash_txn`, `by_accrual_doc`, `by_partial_group` |
| `suspenseItems` | Unmatched items | `by_company`, `by_session`, `by_status` |
| `reconciliationSessions` | Recon session state + stats | `by_company`, `by_status` |
| `categories` | Transaction categorization keywords | `by_company`, `by_keyword`, `by_global` |
| `pdfExportJobs` | Async PDF generation tracking | `by_session`, `by_user`, `by_status` |

### Extraction & Upload Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `extractionQueue` | Batch extraction queue | `by_company`, `by_status`, `by_priority_created` |
| `extractionQueueItems` | Individual queue items + DLQ | `by_queue`, `by_document`, `by_dlq`, `by_next_retry` |
| `uploadAnalyses` | AI document classification results | `by_company`, `by_company_status` |

### Agentic Spreadsheet Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `workspaces` | Spreadsheet workspaces | `by_company` |
| `worksheets` | Spreadsheet tabs | `by_workspace`, `by_workspace_order` |
| `worksheetColumns` | Column definitions + validation | `by_worksheet`, `by_worksheet_order` |
| `worksheetRows` | Row data (cells as JSON) | `by_worksheet`, `by_worksheet_row` |
| `worksheetDataSources` | External data links | `by_worksheet` |
| `worksheetConditionalFormats` | Visual formatting rules | `by_worksheet` |
| `worksheetCharts` | Chart configurations | `by_worksheet` |
| `worksheetMessages` | Spreadsheet AI chat | `by_worksheet` |
| `sheetTemplates` | Reusable templates | `by_category`, `by_company` |
| `agentJobs` | Async enrichment jobs | `by_status`, `by_worksheet`, `by_row` |

### Credits & Billing Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `companyCredits` | Credit balance per company | `by_company` |
| `creditTransactions` | Credit usage audit log | `by_company`, `by_job` |

### System Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `errors` | Self-hosted error monitoring | `by_fingerprint`, `by_type`, `by_resolved` |
| `auditLog` | User action audit trail | `by_company`, `by_user`, `by_action`, `by_resource` |
| `rateLimits` | Per-user rate limiting | `by_user_action` |
| `uploadRateLimits` | Per-company upload rate limiting | `by_company` |
| `onboardingProgress` | Multi-step onboarding state | `by_user` |
| `userPreferences` | Display and notification prefs | `by_user` |
| `counters` | Atomic counters for code generation | `by_key` |
| `reconciliationChatMessages` | AI chat persistence (24h TTL) | `by_session`, `by_expires` |

### Key Schema Notes

- **Ownership model:** `companies.ownerId` -> `users._id` (not `userId` -- renamed to `ownerId`)
- **Soft deletes:** `companies.isDeleted`, `worksheets.deletedAt`, `worksheetRows.deletedAt`
- **Partial matching:** `matchedPairs.isPartialMatch`, `matchedPairs.partialMatchGroupId`, `matchedPairs.matchedAmount`
- **Match layers:** 1 (Exact), 2 (Window), 3 (Reference), 4 (Fuzzy), 5 (Semantic), 6 (Manual), 7 (Partial)
- **Extraction phases:** uploading -> converting -> extracting -> processing -> complete/failed

## Query Patterns

### List with Filtering
```typescript
// convex/companies.ts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
```

### Single Item by ID
```typescript
export const get = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});
```

### Aggregation (Count)
```typescript
export const stats = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const inflow = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const outflow = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { inflow, outflow, net: inflow - outflow, count: transactions.length };
  },
});
```

## Mutation Patterns

### Create
```typescript
// convex/companies.ts
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    industry: v.string(),
    // ...
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return ctx.db.insert("companies", {
      ...args,
      userId: identity.subject,
      onboardingCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### Update
```typescript
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    // partial fields...
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});
```

### Delete (Soft)
```typescript
export const archive = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db.patch(args.id, {
      archivedAt: Date.now(),
      status: "archived"
    });
  },
});
```

## Real-Time Patterns

### Subscription in React
```typescript
import { useQuery } from "convex/react";

function ReconciliationStatus({ sessionId }) {
  // Auto-updates when data changes
  const session = useQuery(api.reconciliationSessions.get, { id: sessionId });

  return <ProgressBar value={session?.matchRate ?? 0} />;
}
```

### Optimistic Updates
```typescript
import { useMutation, useConvexMutation } from "convex/react";

function MatchApproval({ matchId }) {
  const approve = useMutation(api.matchedPairs.approve);

  const handleApprove = async () => {
    // Convex handles optimistic updates automatically
    await approve({ id: matchId });
  };
}
```

## Index Usage

### Always Use Indexes
```typescript
// GOOD - Uses index
ctx.db.query("transactions")
  .withIndex("by_company", (q) => q.eq("companyId", companyId))

// BAD - Full table scan
ctx.db.query("transactions")
  .filter((q) => q.eq(q.field("companyId"), companyId))
```

### Compound Index Queries
```typescript
// by_date index: ["companyId", "date"]
ctx.db.query("transactions")
  .withIndex("by_date", (q) =>
    q.eq("companyId", companyId)
     .gte("date", startDate)
     .lte("date", endDate)
  )
```

## Data Isolation

### User-Scoped Queries
```typescript
// ALWAYS filter by user in queries
export const myCompanies = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
```

### Company-Scoped Access Check
```typescript
// Using the auth helpers from convex/lib/auth.ts
const { user, company } = await requireCompanyAccess(ctx, companyId, workosUserId);
// Throws ConvexError if user doesn't own the company
```

## Matching Engine

The matching engine lives in `convex/matching/` and runs as a Convex action. See `agent_docs/convex-backend.md` for full details.

Key tables involved:
- `transactions` (cash items) + `accrualDocuments` (accrual items) -> `matchedPairs` (results) + `suspenseItems` (unmatched)
- `reconciliationSessions` tracks progress and stats

## Extraction Pipeline

Three extraction paths write to the same tables:

1. **Bedrock Vision** (`nativePdfExtraction.ts`) -- PDF pages -> Bedrock -> `transactions`/`accrualDocuments`
2. **Gemini** (`geminiExtraction.ts`) -- PDF -> Vertex AI -> `transactions`/`accrualDocuments`
3. **Python ML** (`extraction.ts`) -- PDF -> Mistral OCR -> webhook -> `transactions`/`accrualDocuments`

All paths update `documents.extractionStatus` and `documents.extractionProgress` for real-time UI feedback.
