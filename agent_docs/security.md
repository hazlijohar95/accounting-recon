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

### Rust API
```rust
// Use dotenvy
use dotenvy::dotenv;

fn main() {
    dotenv().ok();
    let aws_key = std::env::var("AWS_ACCESS_KEY_ID")
        .expect("AWS_ACCESS_KEY_ID required");
}
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

### Validation
```rust
const MAX_FILE_SIZE: usize = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES: &[&str] = &[
    "application/pdf",
    "image/jpeg",
    "image/png",
];

pub fn validate_upload(file: &UploadedFile) -> Result<(), ValidationError> {
    if file.size > MAX_FILE_SIZE {
        return Err(ValidationError::FileTooLarge);
    }

    if !ALLOWED_TYPES.contains(&file.content_type.as_str()) {
        return Err(ValidationError::InvalidFileType);
    }

    // Check magic bytes to prevent type spoofing
    if !verify_magic_bytes(&file.data, &file.content_type) {
        return Err(ValidationError::TypeMismatch);
    }

    Ok(())
}
```

### S3 Storage
```rust
// Use presigned URLs with short expiry
let presigned = s3_client
    .get_object()
    .bucket("reconciled-documents")
    .key(&file_path)
    .presigned(PresigningConfig::expires_in(Duration::from_secs(300))?)
    .await?;
```

## API Security

### Rate Limiting
```rust
// Using tower-governor
let governor_config = GovernorConfigBuilder::default()
    .per_second(10)
    .burst_size(30)
    .finish()
    .unwrap();

let app = Router::new()
    .layer(GovernorLayer { config: governor_config });
```

### CORS
```rust
let cors = CorsLayer::new()
    .allow_origin(["https://reconciled.dev".parse().unwrap()])
    .allow_methods([Method::GET, Method::POST])
    .allow_headers([CONTENT_TYPE, AUTHORIZATION]);
```

### Input Validation
```rust
#[derive(Deserialize, Validate)]
pub struct ReconciliationRequest {
    #[validate(length(min = 1))]
    company_id: String,

    #[validate(custom = "validate_date")]
    period_start: String,

    #[validate(custom = "validate_date")]
    period_end: String,
}
```

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
