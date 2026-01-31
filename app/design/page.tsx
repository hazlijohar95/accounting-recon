import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogoMark } from '@/components/brand'
import { DesignNav } from './_components/design-nav'
import { HeroSection } from './_components/hero-section'
import { LogoSection } from './_components/logo-section'
import { BrandSection } from './_components/brand-section'
import { PatternsSection } from './_components/patterns-section'
import { ComponentsSection } from './_components/components-section'
import { BrandAssetsSection } from './_components/brand-assets-section'
import { AnimationsSection } from './_components/animations-section'
import { MarketingSection } from './_components/marketing-section'
import { AIFeaturesSection } from './_components/ai-features-section'
import { Logo3DSection } from './_components/logo-3d-section'
import { VideoSection } from './_components/video-section'

export const metadata = {
  title: 'Design System | Reconcile',
  description: 'Design system documentation for Reconcile',
}

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <LogoMark size={24} />
              <span className="font-mono text-sm tracking-wide">reconcile</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">design system</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        <DesignNav />
        <main className="flex-1 max-w-5xl">
          {/* Hero */}
          <HeroSection />

          {/* Content with padding */}
          <div className="px-8 pb-16 space-y-24">
            {/* Intro */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium">Design System</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                A comprehensive guide to Reconcile's visual language. This system ensures consistency
                across all interfaces with a minimal, monochromatic aesthetic featuring sharp edges,
                subtle shadows, and a grayscale palette.
              </p>
              <div className="flex gap-6 pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-4 bg-foreground" />
                  Dark mode first
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-4 border border-border" />
                  Sharp edges only
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-1 bg-muted-foreground" />
                  Minimal shadows
                </div>
              </div>
            </section>

            <LogoSection />
            <BrandSection />
            <PatternsSection />
            <AIFeaturesSection />
            <ComponentsSection />
            <BrandAssetsSection />
            <AnimationsSection />
            <Logo3DSection />
            <VideoSection />
            <MarketingSection />

            {/* Footer */}
            <footer className="border-t border-border pt-8">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Reconcile Design System v1.0</span>
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
