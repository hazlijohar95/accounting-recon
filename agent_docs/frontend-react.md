# Frontend - React (Next.js 16 App Router)

## Project Structure
```
app/                         # Next.js App Router
├── (app)/                   # Authenticated app routes (grouped)
│   ├── dashboard/           # Dashboard page
│   ├── upload/              # Document upload page
│   ├── reconcile/           # Reconciliation workspace (was: reconciliation)
│   ├── reports/             # Reports page
│   ├── settings/            # User/company settings
│   ├── spreadsheet/         # Agentic spreadsheet workspace
│   └── dlq/                 # Dead letter queue (failed extractions)
├── api/                     # Next.js API routes
│   ├── chat/                # AI chat endpoints (assistant, worksheet, onboard)
│   ├── matching/stream/     # Matching SSE endpoint
│   ├── auth/                # WorkOS auth (login, callback, logout)
│   ├── import/csv/          # CSV import
│   └── search/              # Search endpoint
├── docs/                    # Fumadocs documentation pages
├── design/                  # Design system showcase
├── layout.tsx               # Root layout with providers
└── page.tsx                 # Landing page

components/
├── brand/                   # Branded UI components (20+ components)
├── views/                   # Page view components
│   ├── dashboard-view.tsx   # Main dashboard
│   ├── reconcile-view/      # Reconciliation workspace (modularized)
│   ├── upload-view/         # Upload interface (modularized)
│   ├── reports-view.tsx     # Reports interface
│   ├── spreadsheet-view.tsx # Spreadsheet workspace
│   └── dlq-view.tsx         # Dead letter queue view
├── ai/                      # AI-related components
│   ├── reconcile-assistant.tsx  # AI chat assistant
│   ├── reconcile-agent/     # Agentic reconciliation components
│   └── index.ts             # Re-exports
├── spreadsheet/             # Spreadsheet components
├── unified-sheet/           # Unified sheet panel components
├── feedback/                # User feedback components
├── ui/                      # Base UI components (toast, button, select, etc.)
├── app-sidebar.tsx          # Main navigation sidebar
├── company-selector.tsx     # Company selection dropdown
└── transactions-table.tsx   # Transactions data table

hooks/
├── useCopyToClipboard.ts    # Clipboard with auto-reset
├── useIsMobile.ts           # Responsive detection
├── useReducedMotion.ts      # Accessibility preference
├── useFileUploadState.ts    # File upload state management
├── useGeminiExtraction.ts   # Gemini extraction hook
├── usePdfExtraction.ts      # PDF extraction hook
├── useUploadAnalysis.ts     # Upload analysis hook
├── use-generic-spreadsheet.ts # Spreadsheet data hook
└── index.ts                 # Re-exports

lib/
├── store.ts                 # Zustand global state (main)
├── store/                   # Additional store slices
├── convex-hooks.ts          # Custom Convex integration hooks
├── convex-hooks/            # Additional Convex hook modules
├── ai/                      # AI providers, prompts, sanitization
├── constants/               # App constants
├── cn.ts                    # Tailwind class merge utility
├── csrf.ts                  # CSRF protection
├── error-monitor.ts         # Client-side error monitoring
├── data-provider.tsx        # Data provider context
├── use-reconcile-data.ts    # Reconciliation data hook
├── filter-persistence.ts    # Filter state persistence
├── pdf-renderer.ts          # PDF rendering utilities
├── fileUtils.ts             # File handling utilities
└── uploadHandlers.ts        # Upload handler functions

convex/                      # Convex backend
├── schema.ts                # Database schema (30+ tables)
├── matching/                # Matching engine (5 layers)
├── lib/                     # Auth, validators, errors, logging
├── _generated/              # Generated types
└── ...                      # Queries, mutations, actions
```

## React Best Practices

### Don't Use Effects For:

**Data transformation** - Calculate during render:
```tsx
// BAD
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(transactions.filter(t => t.amount > 0));
}, [transactions]);

// GOOD
const filtered = transactions.filter(t => t.amount > 0);
```

**Expensive calculations** - Use useMemo:
```tsx
// BAD
useEffect(() => {
  setTotal(transactions.reduce((sum, t) => sum + t.amount, 0));
}, [transactions]);

// GOOD
const total = useMemo(
  () => transactions.reduce((sum, t) => sum + t.amount, 0),
  [transactions]
);
```

**User events** - Use event handlers:
```tsx
// BAD
useEffect(() => {
  if (submitted) {
    submitForm(formData);
  }
}, [submitted]);

// GOOD
const handleSubmit = () => {
  submitForm(formData);
};
```

**Resetting state on prop change** - Use key:
```tsx
// BAD
useEffect(() => {
  setEditedName(company.name);
}, [company.id]);

// GOOD
<CompanyEditor key={company.id} company={company} />
```

### DO Use Effects For:

**External system sync** (APIs, subscriptions):
```tsx
// Convex real-time subscription
useEffect(() => {
  const unsubscribe = convex.onUpdate(query, setData);
  return () => unsubscribe();
}, [query]);

// WebSocket connection
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handleMessage;
  return () => ws.close();
}, [url]);
```

## Convex Integration

### Queries (read data)
```tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function CompanyList() {
  const companies = useQuery(api.companies.list);

  if (companies === undefined) return <Loading />;
  return <List items={companies} />;
}
```

### Mutations (write data)
```tsx
import { useMutation } from "convex/react";

function CreateCompany() {
  const createCompany = useMutation(api.companies.create);

  const handleSubmit = async (data: CompanyData) => {
    await createCompany(data);
  };
}
```

## API Integration

The frontend communicates with:
- **Convex** directly via `useQuery`/`useMutation` (real-time, type-safe)
- **Next.js API routes** via `fetch` for AI streaming (`/api/chat/assistant`, `/api/matching/stream`)

See `agent_docs/api-routes.md` for details on the Next.js API layer.

## Component Patterns

### Loading States
```tsx
function Dashboard() {
  const data = useQuery(api.dashboard.get);

  if (data === undefined) return <DashboardSkeleton />;
  if (data === null) return <EmptyState />;
  return <DashboardContent data={data} />;
}
```

### Error Boundaries
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <ReconciliationView />
</ErrorBoundary>
```

## Key Brand Components

### StatCard
Animated stat card with number counter and trend indicators.
```tsx
<StatCard
  label="Cash In"
  value={15000}
  prefix="$"
  icon={<IconCashIn />}
  trend="up"
  trendValue="+12%"
  animate
/>
```

### ConfidenceGauge
Circular gauge showing match confidence (0-100%).
```tsx
<ConfidenceGauge value={85} size="md" showLabel />
```

### MatchLayerBadge
Displays which matching algorithm produced a match.
```tsx
<MatchLayerBadge layer={5} size="sm" />
// Layer 1-2: Green (Exact/Window)
// Layer 3-4: Amber (Reference/Fuzzy)
// Layer 5: Purple (AI Semantic)
// Layer 6: Blue (Manual)
```

## State Management (Zustand)

### Typed Selectors
Use individual selectors to prevent re-renders:
```tsx
// GOOD - subscribes to specific slice
const isDemo = useIsDemo()
const matches = useMatches()

// BAD - subscribes to entire store
const { isDemo, matches } = useAppStore()
```

### Composite Selectors
For related state, use useShallow:
```tsx
const { companies, setSelectedCompanyId } = useCompanyState()
```

## Dependencies (package.json)
```json
{
  "dependencies": {
    "next": "16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "convex": "^1.31.7",
    "ai": "^6.0.62",
    "@ai-sdk/amazon-bedrock": "^4.0.41",
    "@ai-sdk/react": "^3.0.64",
    "zustand": "^4.5.0",
    "lucide-react": "^0.563.0",
    "@workos-inc/authkit-nextjs": "^2.13.0",
    "pdfjs-dist": "^5.4.624",
    "recharts": "^3.7.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tailwindcss": "^4.1.18",
    "vitest": "^4.0.18",
    "@playwright/test": "^1.40.0"
  }
}
```
