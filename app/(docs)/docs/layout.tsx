import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/lib/docs-source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2.5 font-medium text-foreground">
            <span className="size-5 bg-foreground rounded-sm" />
            <span className="text-sm tracking-tight">Reconciled</span>
          </span>
        ),
        transparentMode: 'none',
      }}
      sidebar={{
        defaultOpenLevel: 1,
        collapsible: true,
      }}
    >
      {children}
    </DocsLayout>
  );
}
