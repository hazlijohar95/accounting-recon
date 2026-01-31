# Architecture

## System Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│  Dashboard | Upload | Reconciliation | Reports               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONVEX (Database + RT)                   │
│  companies | transactions | accrualDocuments | matchedPairs  │
│  suspenseItems | reconciliationSessions | users              │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐    ┌────────────────────────┐
│    RUST API (Axum)     │    │   PYTHON ML (FastAPI)  │
│  • File processing     │    │  • OCR extraction      │
│  • Export generation   │    │  • LLM matching        │
│  • Heavy computation   │    │  • Categorization      │
└───────────┬────────────┘    └───────────┬────────────┘
            │                             │
            │                             ▼
            │                 ┌────────────────────────┐
            │                 │    AWS BEDROCK         │
            │                 │  • Claude 4.5 Opus     │
            │                 │  • Mistral Large       │
            │                 └────────────────────────┘
            ▼
┌────────────────────────┐
│    AWS S3/Cloudflare   │
│  • Document storage    │
│  • Export files        │
└────────────────────────┘
```

## Service Boundaries

### Frontend (React)
- User interaction only
- Calls Convex directly for CRUD
- Calls Rust API for file uploads and exports
- Real-time updates via Convex subscriptions

### Rust API
Owns:
- File upload/download endpoints
- Matching engine orchestration (calls Python for LLM)
- Excel/CSV export generation
- Heavy computation tasks

Does NOT:
- Store data directly (uses Convex)
- Run ML/LLM inference (delegates to Python)

### Python ML Service
Owns:
- OCR extraction (Mistral OCR)
- LLM semantic matching (AWS Bedrock)
- Transaction categorization
- Document classification

Does NOT:
- Handle file storage (Rust uploads to S3)
- Manage user sessions (Convex handles)

### Convex
Owns:
- All persistent data
- Real-time subscriptions
- Simple CRUD operations
- User session management

Does NOT:
- Heavy file processing
- ML inference

## Data Flow: Document Upload
```
1. User drops PDF → Frontend
2. Frontend → Rust API (multipart upload)
3. Rust API → S3 (store file)
4. Rust API → Python ML (OCR request)
5. Python ML → Mistral OCR API
6. Python ML → Rust API (extracted data)
7. Rust API → Convex (store transactions)
8. Convex → Frontend (real-time update)
```

## Data Flow: Reconciliation
```
1. User clicks "Run Matching" → Frontend
2. Frontend → Rust API (reconciliation request)
3. Rust API: Run Layer 1-4 (rule-based)
4. Rust API → Python ML (Layer 5 LLM batch)
5. Python ML → AWS Bedrock (Claude/Mistral)
6. Python ML → Rust API (LLM matches)
7. Rust API → Convex (store matched pairs)
8. Convex → Frontend (real-time update)
```
