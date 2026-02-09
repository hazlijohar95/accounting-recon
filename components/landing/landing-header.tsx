'use client'

import Link from 'next/link'
import { LogoFull } from '@/components/brand'
import { PremiumButton } from '@/components/brand/premium-button'
import { cn } from '@/lib/utils'

interface LandingHeaderProps {
  className?: string
}

/**
 * Refined landing page header with logo, ALPHA badge, and auth buttons.
 * ALPHA badge is now outline style for a more subtle appearance.
 */
export function LandingHeader({ className }: LandingHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'animate-blur-fade-in',
        className
      )}
      style={{ animationDelay: '100ms' }}
    >
      {/* Logo + ALPHA badge */}
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/" aria-label="Reconcile - Go to homepage">
          <LogoFull />
        </Link>
        <span
          className={cn(
            'inline-block px-1.5 py-0.5',
            'border border-foreground/30 text-foreground/50',
            'text-[9px] font-[family-name:var(--font-pixel)] font-normal tracking-widest'
          )}
        >
          ALPHA
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-3 md:gap-4">
        <Link
          href="/docs"
          className={cn(
            'text-xs md:text-sm font-[family-name:var(--font-pixel)] text-muted-foreground/70',
            'hover:text-foreground transition-colors',
            'px-2 py-1',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          Docs
        </Link>
        <Link href="/api/auth/login">
          <PremiumButton variant="primary" size="sm">
            Reconcile Now
          </PremiumButton>
        </Link>
      </nav>
    </header>
  )
}
