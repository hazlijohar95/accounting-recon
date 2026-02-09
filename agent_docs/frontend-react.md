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
├── design/                  # Design system showcase (see section below)
├── layout.tsx               # Root layout with providers
└── page.tsx                 # Landing page

components/
├── brand/                   # Branded UI components (20+ components)
├── views/                   # Page view components
│   ├── dashboard-view.tsx   # Main dashboard
│   ├── reconcile-view/      # Reconciliation workspace (modularized)
│   │   ├── agent-findings-banner.tsx # Agent findings read-only banner
│   │   ├── match-detail-panel.tsx
│   │   ├── match-row.tsx
│   │   ├── suspense-row.tsx
│   │   ├── filter-bar.tsx
│   │   ├── partial-match-group.tsx
│   │   ├── history-list.tsx
│   │   ├── types.ts
│   │   ├── use-reconcile-state.ts
│   │   └── index.ts
│   ├── upload-view/         # Upload interface (modularized)
│   │   ├── agent/           # Agent intelligence UI layer
│   │   │   ├── agent-flow.tsx         # Main 4-step agent flow orchestrator
│   │   │   ├── agent-step.tsx         # Collapsible accordion step
│   │   │   ├── agent-upload-ack.tsx   # File acknowledgment pre-process
│   │   │   ├── agent-progress-view.tsx # Live extraction progress
│   │   │   ├── finding-card.tsx       # Severity-styled expandable finding
│   │   │   ├── findings-summary.tsx   # Grouped findings display
│   │   │   ├── agent-company-lanes.tsx # Multi-company lane selection
│   │   │   └── index.ts              # Barrel exports
│   │   └── ...
│   ├── reports-view.tsx     # Reports interface
│   ├── spreadsheet-view.tsx # Spreadsheet workspace
│   └── dlq-view.tsx         # Dead letter queue view
├── ai/                      # AI-related components
│   ├── reconcile-assistant.tsx  # AI chat assistant
│   ├── reconcile-agent/     # Agentic reconciliation components
│   │   ├── reconcile-agent.tsx  # Main agent panel (accepts agentSummary prop)
│   │   ├── hooks/
│   │   │   ├── use-reconcile-agent.ts  # AI SDK hook (threads agentSummary to API)
│   │   │   └── use-chat-persistence.ts # Chat persistence hook
│   │   ├── agent-message-list.tsx
│   │   ├── agent-input-bar.tsx
│   │   └── tool-parts/     # Tool UI components (10+ files)
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
├── useAgentSession.ts       # Agent session state + Convex subscriptions (types: AgentFindingData, FindingSeverity)
├── useAgentFindingsForReconciliation.ts  # Cross-page agent findings for /reconcile
├── useMatchActions.ts       # Match approve/reject/undo actions
├── useDemoGuard.ts          # Demo mode action guard
├── useSyncedFormState.ts    # Synced form state
├── useValueAnimation.ts     # Value animation (number counter)
├── useIntersectionAnimation.ts # Intersection observer animations
├── useGridHistory.ts        # Spreadsheet undo/redo history
├── useGridNavigation.ts     # Spreadsheet keyboard navigation
├── useGridSelection.ts      # Spreadsheet cell selection
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
├── schema.ts                # Database schema (37 tables)
├── matching/                # Matching engine (5 layers)
├── agentSession.ts          # Agent session CRUD + lifecycle
├── agentEngine.ts           # 3-layer intelligence engine
├── exports/                 # Export system (bank recon, accounting integrations)
├── lib/                     # Auth, validators, errors, logging, agent rules/cross-ref/LLM
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

## Design System Showcase (`/design`)

The design page is a comprehensive internal showcase at `app/(main)/design/` that documents all brand components, animations, patterns, icons, and UI primitives. It is a **client-rendered** route behind the authenticated layout.

### Architecture

The page follows a **section-based architecture** with shared utility components:

```
app/(main)/design/
├── page.tsx                          # Orchestrator - imports all sections
├── loading.tsx                       # Loading skeleton
├── _components/
│   ├── demo-card.tsx                 # Shared demo card (feature/animation/3d variants)
│   ├── code-block.tsx                # Source code display with copy + line numbers
│   ├── command-block.tsx             # Terminal command display with copy
│   ├── design-nav.tsx               # Sticky section navigation
│   ├── hero-section.tsx             # Page hero with logo
│   ├── brand-section.tsx            # Color palettes, typography
│   ├── brand-assets-section.tsx     # Brand asset downloads
│   ├── logo-section.tsx             # Logo variants (server component)
│   ├── logo-3d-section.tsx          # WebGL 3D logo demos (dynamic imports)
│   ├── icons-section.tsx            # 150+ icon grid with search + copy
│   ├── patterns-section.tsx         # Layout pattern wireframes (server component)
│   ├── animations-section.tsx       # Animation demos (loading, success, error, transitions)
│   ├── ai-features-section.tsx      # 5-layer pipeline, confidence gauges, categorization
│   ├── components-section.tsx       # UI component demos (thin orchestrator)
│   ├── video-section.tsx            # Remotion launch video player
│   ├── marketing-section.tsx        # OG images, social cards, posters
│   └── components/                  # Sub-demos for components-section
│       ├── buttons-demo.tsx         # Button variants + state toggle
│       ├── form-inputs-demo.tsx     # Text, file, checkbox inputs
│       ├── cards-demo.tsx           # Stats card, list container
│       ├── navigation-demo.tsx      # Sidebar nav, tab nav
│       ├── status-demos.tsx         # Dot indicators, badges, progress, alerts, timeline
│       ├── modal-demo.tsx           # Modal dialog preview
│       ├── data-display-demos.tsx   # Data table, comparison diff view
│       └── filter-search-demo.tsx   # Search bar, filter pills, advanced filters
```

### Shared Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `DemoCard` | Unified wrapper for demo previews | `title`, `description`, `variant` (`feature`/`animation`/`3d`), `onReplay?`, `className?` |
| `CodeBlock` | Source code with syntax label + copy | `code`, `language?`, `showLineNumbers?`, `className?` |
| `CommandBlock` | Terminal command with label + copy | `label`, `command` |

### Design Decisions

- **`DemoCard` variants** replace three identical local wrappers (`FeatureDemo`, `AnimationDemo`, `Demo3DCard`) that existed across section files
- **`CommandBlock`** is separate from `CodeBlock` because terminal commands need a label/command UI vs source code with language tags
- **`components-section.tsx`** is a thin orchestrator (~40 lines) importing 11 sub-demo components from the `components/` subdirectory, keeping the 948-line monolith split into focused files
- **`logo-3d-section.tsx`** uses `next/dynamic` with `ssr: false` for WebGL components
- **`logo-section.tsx`** and **`patterns-section.tsx`** are server components (no interactivity)

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
