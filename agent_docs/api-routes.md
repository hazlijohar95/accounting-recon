# Next.js API Routes

Next.js API routes handle functionality that requires server-side execution outside of Convex: AI streaming, auth callbacks, and data import.

All routes are in `app/api/`.

## Route Overview

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat/assistant` | POST | Reconciliation AI agent (streaming) |
| `/api/chat/route.ts` | POST | General chat endpoint |
| `/api/chat/worksheet` | POST | Spreadsheet AI chat |
| `/api/chat/onboard` | POST | Onboarding conversational AI |
| `/api/matching/stream` | POST | Matching reasoning stream (SSE) |
| `/api/auth/login` | GET | WorkOS login redirect |
| `/api/auth/callback` | GET | WorkOS OAuth callback |
| `/api/auth/logout` | GET | WorkOS logout |
| `/api/import/csv` | POST | CSV file import |
| `/api/search` | GET/POST | Search endpoint |

## AI Chat Routes

### `/api/chat/assistant` (Reconciliation Agent)

The main AI assistant for reconciliation. Uses Vercel AI SDK with AWS Bedrock.

**Key features:**
- Streaming response via `streamText()`
- Tool calling (read session data, approve/reject matches, explain reasoning)
- CSRF validation (`validateCSRF`)
- Rate limiting (per-user)
- Message count limit (100 messages max per request)
- Request body size limit (1MB)
- Input sanitization (`sanitizeForPrompt`)
- Chat history persisted to Convex (24h retention)

**Tech:**
- Model: `agentModel` from `lib/ai/bedrock-provider` (Claude via Bedrock)
- Prompt: `AGENTIC_ASSISTANT_PROMPT` from `lib/ai/prompts`
- Auth: WorkOS session validation via `getSession()`
- Convex client: `getAuthedConvexClient()` for tool calls

### `/api/chat/worksheet` (Spreadsheet Chat)

AI chat for querying and manipulating spreadsheet data.

### `/api/chat/onboard` (Onboarding)

Conversational onboarding flow for new users.

### `/api/matching/stream` (Matching Reasoning)

Streams AI-generated explanations of why specific matches were made or suggested.

**Key features:**
- Streaming response via `streamText()`
- Takes cash transactions + accrual documents as input
- Returns human-readable matching reasoning
- CSRF validation + rate limiting
- Model: `reconciliationModel` from `lib/ai/bedrock-provider`

## Auth Routes

### `/api/auth/login`
Redirects to WorkOS hosted login page.

### `/api/auth/callback`
Handles OAuth callback from WorkOS. Creates/updates user in Convex, sets session cookie.

### `/api/auth/logout`
Clears session cookie, redirects to login.

## Data Import

### `/api/import/csv`
Parses uploaded CSV files and imports transactions into Convex.

## Search

### `/api/search`
Search endpoint for documentation and application data.

## Security Patterns

All mutating API routes implement:
1. **CSRF validation** -- `validateCSRF(request)` checks Origin header + double-submit cookie
2. **Rate limiting** -- per-user rate limits with configurable windows
3. **Auth verification** -- WorkOS session check via `getSession()`
4. **Input sanitization** -- `sanitizeForPrompt()` strips injection patterns from AI inputs
5. **Body size limits** -- prevent memory exhaustion attacks

## AI Provider Configuration (`lib/ai/`)

| File | Purpose |
|------|---------|
| `bedrock-provider.ts` | AWS Bedrock model configuration (agentModel, reconciliationModel) |
| `prompts.ts` | System prompts for all AI features |
| `sanitize.ts` | Input sanitization for LLM prompts |
