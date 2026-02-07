# Security

## Authentication (WorkOS)

### Setup
```typescript
// In convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://auth.workos.com",
      applicationID: process.env.WORKOS_CLIENT_ID,
    },
  ],
};
```

### User Verification
```typescript
// In any Convex function
export const myQuery = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }
    // identity.subject = user ID
    // identity.email = user email
  },
});
```

## Data Isolation

### Row-Level Security
Every query MUST filter by user:

```typescript
// CORRECT
export const getCompanies = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// WRONG - Exposes all companies
export const getCompanies = query({
  handler: async (ctx) => {
    return ctx.db.query("companies").collect();
  },
});
```

### Cross-Company Access Check
```typescript
async function verifyCompanyAccess(
  ctx: QueryCtx,
  companyId: Id<"companies">
): Promise<Doc<"companies">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthorized");

  const company = await ctx.db.get(companyId);
  if (!company) throw new ConvexError("Company not found");
  if (company.userId !== identity.subject) {
    throw new ConvexError("Forbidden");
  }

  return company;
}
```

## Secrets Management

### Environment Variables
```bash
# .env.local (never commit)
CONVEX_DEPLOYMENT=...
WORKOS_CLIENT_ID=...
WORKOS_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
MISTRAL_API_KEY=...
```

### Convex Environment Variables
```bash
npx convex env set WORKOS_API_KEY sk_...
npx convex env set AWS_ACCESS_KEY_ID AKIA...
```

### Python ML Service
```python
# Use pydantic-settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    aws_access_key_id: str
    aws_secret_access_key: str
    mistral_api_key: str

    class Config:
        env_file = ".env"
```

## File Upload Security

### Convex File Storage
Files are uploaded to Convex's built-in `_storage` system, which handles:
- Secure blob storage with access control
- Storage IDs linked to document records
- No direct URL exposure (accessed via Convex queries)

### Upload Rate Limiting
```typescript
// convex/schema.ts - uploadRateLimits table
// Limits uploads per company per minute to prevent abuse
uploadRateLimits: defineTable({
  companyId: v.id("companies"),
  timestamps: v.array(v.number()),
  updatedAt: v.number(),
}).index("by_company", ["companyId"])
```

### File Type Validation
Document type is validated on upload via Convex validators:
```typescript
documentType: v.union(
  v.literal("bank_statement"),
  v.literal("invoice"),
  v.literal("receipt"),
  v.literal("other")
)
```

## API Security

### CSRF Protection (`lib/csrf.ts`)
Next.js API routes use double-submit cookie pattern + origin validation:
```typescript
// Defense layers:
// 1. Origin/Referer header validation (primary)
// 2. Double-submit cookie pattern (x-csrf-token header must match cookie)
const { valid, error } = validateCSRF(request);
```

Allowed origins: `https://reconciled.dev`, `https://www.reconciled.dev` (+ `localhost:3000` in dev).

### Rate Limiting
Three levels of rate limiting:

1. **Convex `rateLimits` table** -- per-user limits on destructive actions (delete account, export data)
2. **Convex `uploadRateLimits` table** -- per-company upload limits
3. **Next.js API routes** -- per-user rate limits on AI chat and matching endpoints
4. **Python ML** -- `slowapi` per-IP rate limits on `/extract` (30/min) and `/generate-pdf` (10/min)

### Input Validation
Convex functions use `v.` validators for all arguments:
```typescript
args: {
  companyId: v.id("companies"),    // Type-safe Convex ID
  name: v.string(),                // String validation
  amount: v.number(),              // Number validation
  status: v.union(                 // Enum validation
    v.literal("pending"),
    v.literal("matched"),
    v.literal("suspense")
  ),
}
```

AI inputs are sanitized via `lib/ai/sanitize.ts` to prevent prompt injection.

## Audit Trail

### Log All Sensitive Actions
```typescript
// In Convex mutations
export const deleteCompany = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Log before action
    await ctx.db.insert("auditLog", {
      action: "company.delete",
      userId: identity!.subject,
      targetId: args.id,
      timestamp: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});
```

## Sensitive Data Handling

### PII Minimization
- Don't store unnecessary personal data
- Mask account numbers in logs: `562843XXXX6011`
- Encrypt sensitive fields at rest if needed

### Data Retention
```typescript
// Scheduled job to clean old data
export const cleanupOldData = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days

    // Delete old audit logs
    const oldLogs = await ctx.db
      .query("auditLog")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .collect();

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
  },
});
```
