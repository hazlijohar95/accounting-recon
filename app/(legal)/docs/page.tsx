import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation | Reconciled',
  description: 'Documentation and guides for Reconciled - Automated accounting reconciliation platform',
}

export default function DocsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <header className="not-prose mb-12">
        <h1 className="text-2xl md:text-3xl font-mono font-medium tracking-tight">
          Documentation
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          Coming soon
        </p>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-secondary flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Documentation is being prepared.
            </p>
          </div>
        </div>
      </section>
    </article>
  )
}
