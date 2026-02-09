'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import {
  LandingHeader,
  RecommendationCard,
  HeroText,
  FallbackText,
  GeometricGrid,
} from '@/components/landing'
import {
  IconUpload,
  IconReconcile,
} from '@/components/brand'

const QUICK_ACTIONS = [
  {
    title: 'Upload statements',
    icon: <IconUpload size={28} />,
    href: '/upload',
  },
  {
    title: 'Review matches',
    icon: <IconReconcile size={28} />,
    href: '/reconcile',
  },
]

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-background">
      {/* Geometric background */}
      <GeometricGrid />

      {/* Header */}
      <LandingHeader className="relative z-10 h-14 md:h-16 flex-shrink-0 px-4 md:px-6 lg:px-10" />

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 lg:px-10">
        {/* Hero section - more generous spacing */}
        <div className="w-full max-w-3xl mb-12 md:mb-20 lg:mb-24">
          <Suspense fallback={<FallbackText />}>
            <HeroText />
          </Suspense>

          {/* Decorative divider with dot accent */}
          <div
            className="flex items-center justify-center gap-3 mt-10 animate-blur-fade-in"
            style={{ animationDelay: '900ms' }}
            aria-hidden="true"
          >
            <div className="w-12 h-[1px] bg-foreground/15" />
            <div className="w-1 h-1 bg-foreground/30" />
            <div className="w-12 h-[1px] bg-foreground/15" />
          </div>
        </div>

        {/* Simplified flow */}
        <div className="w-full max-w-3xl space-y-8">
          {/* Primary CTA card */}
          <div
            className="border border-border/50 bg-background/60 backdrop-blur-sm px-6 py-5 animate-blur-fade-in"
            style={{ animationDelay: '500ms' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-[family-name:var(--font-pixel)]">Start here</p>
                <h2 className="text-lg md:text-xl font-medium mt-1.5 text-foreground/90">Start a new reconciliation</h2>
                <p className="text-sm text-muted-foreground/70 mt-1.5 leading-relaxed">
                  Upload statements and invoices, then review AI&#8209;matched transactions.
                </p>
              </div>
              <Link href="/upload" className="inline-flex flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <span className="px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
                  Start Reconciliation
                </span>
              </Link>
            </div>

            {/* Simplified stepper - less prominent */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5 pt-5 border-t border-border/30">
              {[
                { step: '01', label: 'Upload' },
                { step: '02', label: 'Match' },
                { step: '03', label: 'Review' },
                { step: '04', label: 'Export' },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="text-[9px] font-[family-name:var(--font-pixel)] text-muted-foreground/50">{item.step}</span>
                  <span className="text-xs text-muted-foreground/60">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions - reduced to 2 cards */}
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-[family-name:var(--font-pixel)] mb-4 animate-blur-fade-in"
              style={{ animationDelay: '600ms' }}
            >
              Quick actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {QUICK_ACTIONS.map((rec, i) => (
                <RecommendationCard
                  key={rec.href}
                  title={rec.title}
                  icon={rec.icon}
                  href={rec.href}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - refined */}
      <footer className="relative z-10 py-5 md:py-6 flex flex-col items-center justify-center gap-3 pb-safe px-4">
        {/* Decorative line */}
        <div
          className="w-6 h-[1px] bg-foreground/10 animate-blur-fade-in"
          style={{ animationDelay: '1100ms' }}
          aria-hidden="true"
        />

        {/* Legal links */}
        <nav
          className="flex items-center gap-5 md:gap-6 animate-blur-fade-in"
          style={{ animationDelay: '1200ms' }}
        >
          <Link
            href="/terms"
            className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors font-[family-name:var(--font-pixel)] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors font-[family-name:var(--font-pixel)] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Privacy
          </Link>
          <Link
            href="/pdpa"
            className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors font-[family-name:var(--font-pixel)] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            PDPA
          </Link>
        </nav>

        {/* Copyright */}
        <p
          className="text-[10px] md:text-xs text-muted-foreground/50 font-[family-name:var(--font-pixel)] tracking-wide animate-blur-fade-in"
          style={{ animationDelay: '1300ms' }}
        >
          &copy; {new Date().getFullYear()} Cynco Sdn. Bhd. (1588139-X)
        </p>
      </footer>
    </div>
  )
}
