'use client'

import { Suspense } from 'react'
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

      {/* Footer accent - enhanced visibility */}
      <footer className="relative z-10 h-12 md:h-16 flex flex-col items-center justify-center gap-2 pb-safe">
        {/* Decorative line above tagline */}
        <div
          className="w-8 h-[1px] bg-muted-foreground/30 animate-fade-in"
          style={{ animationDelay: '1100ms' }}
          aria-hidden="true"
        />
        <p
          className="text-xs text-muted-foreground/60 font-mono tracking-wide animate-fade-in"
          style={{ animationDelay: '1200ms' }}
        >
          Automated reconciliation for modern finance teams
        </p>
      </footer>
    </div>
  )
}
