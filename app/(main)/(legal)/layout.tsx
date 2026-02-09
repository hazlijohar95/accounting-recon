'use client'

import Link from 'next/link'
import { LogoFull } from '@/components/brand'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <LogoFull />
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] md:text-xs text-muted-foreground/50 font-mono">
            © {new Date().getFullYear()} Cynco Sdn. Bhd. (1588139-X)
          </p>
          <nav className="flex items-center gap-4 md:gap-6">
            <Link
              href="/terms"
              className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono"
            >
              Privacy
            </Link>
            <Link
              href="/pdpa"
              className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono"
            >
              PDPA
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
