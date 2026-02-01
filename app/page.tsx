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
  IconDashboard,
  IconReports,
} from '@/components/brand'

const RECOMMENDATIONS = [
  {
    title: 'Upload bank statements',
    icon: <IconUpload size={28} />,
    href: '/upload',
  },
  {
    title: 'Review transactions',
    icon: <IconReconcile size={28} />,
    href: '/reconcile',
  },
  {
    title: 'Open workspace',
    icon: <IconDashboard size={28} />,
    href: '/workspace',
  },
  {
    title: 'View reports',
    icon: <IconReports size={28} />,
    href: '/reports',
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
        {/* Hero section */}
        <div className="w-full max-w-4xl mb-10 md:mb-16 lg:mb-20">
          <Suspense fallback={<FallbackText />}>
            <HeroText />
          </Suspense>

          {/* Decorative line under hero */}
          <div
            className="mx-auto mt-8 w-16 h-[2px] bg-foreground/20 animate-scale-in origin-center"
            style={{ animationDelay: '800ms' }}
            aria-hidden="true"
          />
        </div>

        {/* Recommendation Cards */}
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {RECOMMENDATIONS.map((rec, i) => (
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
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 md:py-6 flex flex-col items-center justify-center gap-3 pb-safe px-4">
        {/* Decorative line */}
        <div
          className="w-8 h-[1px] bg-muted-foreground/20 animate-fade-in"
          style={{ animationDelay: '1100ms' }}
          aria-hidden="true"
        />

        {/* Legal links */}
        <nav
          className="flex items-center gap-4 md:gap-6 animate-fade-in"
          style={{ animationDelay: '1200ms' }}
        >
          <Link
            href="/terms"
            className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono tracking-wide"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono tracking-wide"
          >
            Privacy
          </Link>
          <Link
            href="/pdpa"
            className="text-[10px] md:text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono tracking-wide"
          >
            PDPA
          </Link>
        </nav>

        {/* Copyright */}
        <p
          className="text-[10px] md:text-xs text-muted-foreground/40 font-mono tracking-wide animate-fade-in"
          style={{ animationDelay: '1300ms' }}
        >
          © {new Date().getFullYear()} Cynco Sdn. Bhd. (1588139-X)
        </p>
      </footer>
    </div>
  )
}
