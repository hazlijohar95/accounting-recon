# Database - Convex

## Schema Overview

See `convex/schema.ts` for full schema. Key tables:

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | User accounts | `by_email` |
| `companies` | Client companies | `by_user`, `by_code` |
| `documents` | Uploaded files | `by_company`, `by_status` |
| `transactions` | Bank transactions | `by_company`, `by_date`, `by_category` |
| `accrualDocuments` | Invoices/receipts | `by_company`, `by_status`, `by_date` |
| `matchedPairs` | Matched transactions | `by_company`, `by_session` |
| `suspenseItems` | Unmatched items | `by_company`, `by_status` |
| `reconciliationSessions` | Recon sessions | `by_company`, `by_period` |

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
async function checkCompanyAccess(ctx, companyId: Id<"companies">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const company = await ctx.db.get(companyId);
  if (!company || company.userId !== identity.subject) {
    throw new Error("Forbidden");
  }
  return company;
}
```
