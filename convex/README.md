# Convex Database Setup

## Quick Start

1. **Create a Convex Account**

   Go to [convex.dev](https://www.convex.dev) and sign up for a free account.

2. **Initialize Convex Project**

   Run the following command to link this project to Convex:
   ```bash
   npx convex dev
   ```

   This will:
   - Prompt you to log in to Convex
   - Create a new project (or link to existing)
   - Generate proper types in `convex/_generated/`
   - Sync the schema to your Convex deployment
   - Start watching for changes

3. **Set Environment Variable**

   Copy the Convex URL from the terminal output and add it to your `.env.local`:
   ```bash
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

4. **Run Development**

   In separate terminals:
   ```bash
   # Terminal 1: Next.js dev server
   pnpm dev

   # Terminal 2: Convex dev (watches for changes)
   pnpm dev:convex
   ```

   Or use the combined command:
   ```bash
   pnpm dev:all
   ```

## Schema Overview

| Table | Description |
|-------|-------------|
| `users` | Authenticated users (WorkOS) |
| `companies` | Client companies (multi-tenant) |
| `transactions` | Bank transactions and accrual records |
| `documents` | Uploaded files (statements, invoices) |
| `matchedPairs` | Reconciliation match results |
| `reconciliationSessions` | Grouping of recon work |

## Key Files

- `schema.ts` - Database schema definition
- `users.ts` - User queries and mutations
- `companies.ts` - Company CRUD operations
- `transactions.ts` - Transaction operations
- `matches.ts` - Match management
- `sessions.ts` - Reconciliation session management
- `documents.ts` - Document/file operations

## Dashboard

Access your Convex dashboard at: https://dashboard.convex.dev

From there you can:
- View and edit data
- Monitor query performance
- View logs and errors
- Manage deployments

## Production Deployment

To deploy to production:
```bash
npx convex deploy
```

This will:
- Push schema changes to production
- Deploy all functions
- Generate a production URL

Update your production environment variable with the new URL.
