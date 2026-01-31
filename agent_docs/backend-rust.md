# Backend - Rust (Axum)

## Project Structure
```
src/
├── main.rs              # Entry point, server setup
├── api/
│   ├── mod.rs           # Route definitions
│   ├── documents.rs     # Upload, status endpoints
│   ├── reconciliation.rs# Matching, session endpoints
│   └── export.rs        # Excel, accounting exports
├── services/
│   ├── mod.rs
│   ├── storage.rs       # S3 operations
│   ├── matching.rs      # Layer 1-4 logic
│   └── ml_client.rs     # Python ML HTTP client
├── models/
│   ├── mod.rs
│   ├── transaction.rs
│   └── match_result.rs
└── error.rs             # Error types
```

## API Endpoints

### Documents
```rust
POST   /api/v1/documents/upload      // Multipart file upload
GET    /api/v1/documents/:id/status  // Extraction status
DELETE /api/v1/documents/:id         // Remove document
```

### Reconciliation
```rust
POST   /api/v1/reconciliation/run    // Start matching
GET    /api/v1/reconciliation/:id    // Session status
POST   /api/v1/reconciliation/:id/approve  // Approve matches
```

### Export
```rust
POST   /api/v1/export/excel          // Bank recon statement
POST   /api/v1/export/accounting     // Software-specific format
GET    /api/v1/export/:id/download   // Download generated file
```

## Axum Patterns

### Route Setup
```rust
// In main.rs
let app = Router::new()
    .nest("/api/v1", api::routes())
    .layer(CorsLayer::permissive())
    .layer(TraceLayer::new_for_http())
    .with_state(AppState::new());
```

### Handler Pattern
```rust
// In api/documents.rs
pub async fn upload(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    // Process file
    // Return response
}
```

### Error Handling
```rust
// In error.rs
#[derive(Debug)]
pub enum AppError {
    Storage(StorageError),
    Extraction(String),
    Validation(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Convert to JSON error response
    }
}
```

## Matching Engine (Layer 1-4)

### Layer Execution Order
```rust
pub fn run_matching(bank: &[Transaction], accrual: &[AccrualDoc]) -> Vec<MatchResult> {
    let mut matched = Vec::new();
    let mut remaining_bank = bank.to_vec();
    let mut remaining_accrual = accrual.to_vec();

    // Layer 1: Exact (±0.01 amount, ±3 days)
    let (l1_matches, remaining) = layer_exact(&remaining_bank, &remaining_accrual);
    matched.extend(l1_matches);

    // Layer 2: Window (±0.01 amount, ±7 days)
    // Layer 3: Reference (invoice number in description)
    // Layer 4: Fuzzy (Levenshtein on names, ±10% amount)

    // Remaining goes to Python ML (Layer 5)
    matched
}
```

### Confidence Scores
- Layer 1: 100% (exact)
- Layer 2: 88-95% (window)
- Layer 3: 85-95% (reference)
- Layer 4: 70-85% (fuzzy)

## ML Client
```rust
// In services/ml_client.rs
pub async fn request_llm_matching(
    client: &Client,
    bank_items: &[Transaction],
    accrual_items: &[AccrualDoc],
) -> Result<Vec<LlmMatch>, MlError> {
    let response = client
        .post(&format!("{}/ml/v1/match/semantic", ML_SERVICE_URL))
        .json(&MatchRequest { bank_items, accrual_items })
        .send()
        .await?;
    response.json().await
}
```

## Dependencies (Cargo.toml)
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json"] }
aws-sdk-s3 = "1"
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"
thiserror = "1"
calamine = "0.24"        # Excel reading
xlsxwriter = "0.6"       # Excel writing
strsim = "0.11"          # Fuzzy string matching
```
