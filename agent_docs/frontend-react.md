# Frontend - React (Next.js 16 App Router)

## Project Structure
```
app/                         # Next.js App Router
├── (app)/                   # Authenticated app routes (grouped)
│   ├── dashboard/           # Dashboard page
│   ├── upload/              # Document upload page
│   ├── reconcile/           # Reconciliation workspace
│   └── reports/             # Reports page
├── design/                  # Design system showcase
│   └── _components/         # Design page sections
├── layout.tsx               # Root layout with providers
└── page.tsx                 # Landing page

components/
├── brand/                   # Branded UI components
│   ├── stat-card.tsx        # Animated stat cards
│   ├── confidence-gauge.tsx # Circular confidence indicator
│   ├── match-layer-badge.tsx # Match layer indicators
│   ├── loading-spinner.tsx  # Geometric loading animation
│   ├── logo-animated.tsx    # Animated logo mark
│   ├── logo-mark.tsx        # Static logo
│   └── ...                  # 20+ brand components
├── views/                   # Page view components
│   ├── dashboard-view.tsx   # Main dashboard
│   ├── reconcile-view.tsx   # Reconciliation workspace
│   ├── upload-view.tsx      # Upload interface
│   └── reports-view.tsx     # Reports interface
├── ai/                      # AI-related components
│   ├── assistant-panel.tsx  # AI chat assistant
│   └── matching-reasoning.tsx # AI matching explanation
├── ui/                      # Base UI components
│   ├── toast.tsx            # Toast notifications
│   └── error-boundary.tsx   # Error handling
├── app-sidebar.tsx          # Main navigation sidebar
├── auth-provider.tsx        # WorkOS authentication
└── convex-provider.tsx      # Convex real-time provider

hooks/
├── useCopyToClipboard.ts    # Clipboard with auto-reset
├── useIsMobile.ts           # Responsive detection
├── useReducedMotion.ts      # Accessibility preference
└── index.ts                 # Re-exports

lib/
├── store.ts                 # Zustand global state
├── convex-hooks.ts          # Custom Convex integration hooks
├── utils.ts                 # cn() and utilities
└── matching-utils.ts        # Matching algorithm helpers

convex/                      # Convex backend
├── schema.ts                # Database schema
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

## Rust API Client

### Upload Pattern
```tsx
// In lib/api.ts
export async function uploadDocument(file: File, companyId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("companyId", companyId);

  const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new ApiError(await response.json());
  return response.json();
}
```

### Hook Pattern
```tsx
// In hooks/useUpload.ts
export function useUpload(companyId: string) {
  const [status, setStatus] = useState<UploadStatus>("idle");

  const upload = async (files: File[]) => {
    setStatus("uploading");
    try {
      await Promise.all(files.map(f => uploadDocument(f, companyId)));
      setStatus("success");
    } catch (error) {
      setStatus("error");
      throw error;
    }
  };

  return { upload, status };
}
```

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

### Form Handling
```tsx
// Use react-hook-form
import { useForm } from "react-hook-form";

function OnboardingWizard() {
  const { register, handleSubmit, formState } = useForm<CompanyData>();

  const onSubmit = handleSubmit(async (data) => {
    await createCompany(data);
  });
}
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
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "convex": "^1.9.0",
    "zustand": "^4.5.0",
    "lucide-react": "^0.303.0",
    "@workos-inc/authkit-nextjs": "^0.7.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tailwindcss": "^4.0.0"
  }
}
```
