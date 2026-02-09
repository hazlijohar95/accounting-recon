import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: [
      '__tests__/**/*.{test,spec}.{ts,tsx}',
      'convex/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'lib/**/*.{test,spec}.{ts,tsx}',
      'hooks/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'e2e',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        'remotion/',
        '.next/',
        'convex/_generated/',
        'convex/migrations/',
        // Convex server handlers: export query()/mutation() wrappers that require
        // a real Convex runtime (convexTest). Unit tests cover their validation
        // and domain logic via shared lib modules instead.
        'convex/*.ts',
        // Next.js pages, layouts, and API route handlers need integration/E2E tests
        'app/**/*.{ts,tsx}',
        // Full-page view components are tested via E2E (Playwright)
        'components/views/**/*.tsx',
        // AI agent component (complex hooks wrapping AI SDK)
        'components/ai/**/*.{ts,tsx}',
        // Brand 3D components, animations, icons (rendering-only, no logic)
        'components/brand/3d/**',
        'components/brand/icons/**',
        'components/brand/*-animated.tsx',
        'components/brand/*-animation.tsx',
        'components/brand/logo-*.tsx',
        'components/brand/pixel-*.tsx',
        // Spreadsheet core rendering components (tested via E2E)
        'components/spreadsheet/core/**',
        'components/spreadsheet/univer-sheet.tsx',
        'components/spreadsheet/*-dynamic.tsx',
        // Onboarding components (UI-heavy, needs E2E)
        'components/onboarding/**',
        // Convex React hook wrappers (thin useQuery/useMutation calls)
        'lib/convex-hooks/**/*.ts',
        // Store files with complex side effects
        'lib/store/**/*.ts',
        // Server-only modules
        'lib/auth-server.ts',
        'lib/convex-server.ts',
        'lib/convex-hooks.ts',
        'lib/docs-source.ts',
        'lib/error-monitor.ts',
        'lib/sentry.ts',
        'lib/data-provider.tsx',
        'lib/store.ts',
        'lib/exports/**',
        // PDF renderer (browser-only canvas rendering)
        'lib/pdf-renderer.ts',
        // Upload handlers (integration with Convex)
        'lib/uploadHandlers.ts',
        // Mono component (font loading)
        'lib/mono.tsx',
        // Filter persistence (URL state, needs router)
        'lib/filter-persistence.ts',
        // MDX components (doc rendering)
        'lib/mdx-components.tsx',
        // Convex status hook
        'lib/use-convex-status.ts',
        // Re-export barrels and type files
        '**/index.ts',
        '**/types.ts',
        // Convex server actions
        'convex/exports/index.ts',
        'convex/exports/pdf.ts',
        // Convex lib modules that import from Convex runtime (_generated/server)
        // These need convexTest() or integration tests, not unit tests
        'convex/lib/auth.ts',
        'convex/lib/auditLogger.ts',
        'convex/lib/aggregates.ts',
        'convex/lib/validators.ts',
        'convex/lib/vertexAuth.ts',
        'convex/lib/workspaceAuth.ts',
        'convex/lib/workspaceCascade.ts',
        'convex/lib/workspaceValidators.ts',
        'convex/lib/extractionLogger.ts',
        'convex/lib/matchingLogger.ts',
        // Convex matching engine (imports Convex runtime)
        'convex/matching/engine.ts',
        'convex/matching/layers/semantic.ts',
        // Spreadsheet reconciliation modules (rendering)
        'components/spreadsheet/reconciliation/**',
        // Brand components (rendering-only, no testable logic)
        'components/brand/manual-match-modal.tsx',
        'components/brand/skeleton.tsx',
        'components/brand/*-transition.tsx',
        'components/brand/*-state.tsx',
        'components/brand/*-chart.tsx',
        'components/brand/*-section.tsx',
        'components/brand/*-select.tsx',
        'components/brand/*-pipeline.tsx',
        'components/brand/*-button.tsx',
        'components/brand/*-text.tsx',
        // Hooks that wrap Convex or need complex browser/SDK mocking
        'hooks/useMatchActions.ts',
        'hooks/usePdfExtraction.ts',
        'hooks/useGeminiExtraction.ts',
        'hooks/useFileUploadState.ts',
        'hooks/useUploadAnalysis.ts',
        'hooks/useDemoGuard.ts',
        'hooks/use-generic-spreadsheet.ts',
        'hooks/useIntersectionAnimation.ts',
        // Lib files needing router/browser context
        'lib/matching-utils.ts',
        'lib/ai/bedrock-provider.ts',
        'lib/ai/prompts.ts',
        'lib/ai/worksheet-context.ts',
        'lib/ai/index.ts',
        'lib/cn.ts',
        'lib/grid-qa-schema.ts',
      ],
      include: [
        'components/ui/**/*.{ts,tsx}',
        'components/brand/**/*.{ts,tsx}',
        'components/spreadsheet/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'convex/lib/**/*.ts',
        'convex/matching/**/*.ts',
        'convex/exports/**/*.ts',
        'convex/utils/**/*.ts',
      ],
      thresholds: {
        // Global thresholds for unit-testable code
        // Current: ~72% stmts, ~64% branches, ~72% functions, ~73% lines
        // Set slightly below current to prevent regression while allowing flexibility
        statements: 65,
        branches: 55,
        functions: 65,
        lines: 65,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'next/cache': path.resolve(__dirname, './__tests__/__mocks__/next-cache.ts'),
      '@workos-inc/authkit-nextjs/components': path.resolve(__dirname, './__tests__/__mocks__/authkit-nextjs-components.ts'),
      '@workos-inc/authkit-nextjs': path.resolve(__dirname, './__tests__/__mocks__/authkit-nextjs.ts'),
    },
  },
})
