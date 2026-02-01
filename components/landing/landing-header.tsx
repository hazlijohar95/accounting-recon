'use client'

import Link from 'next/link'
import { LogoFull } from '@/components/brand'
import { PremiumButton } from '@/components/brand/premium-button'
import { cn } from '@/lib/utils'

interface LandingHeaderProps {
  className?: string
}

/**
 * Landing page header with logo, ALPHA badge, and auth buttons.
 * Refined with geometric styling and entrance animation.
 */
export function LandingHeader({ className }: LandingHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'animate-fade-in',
        className
      )}
      style={{ animationDelay: '100ms' }}
    >
      {/* Logo + ALPHA badge */}
      <div className="flex items-center gap-2 md:gap-4">
        <LogoFull />
        <div className="relative">
          <span
            className={cn(
              'inline-block px-2 py-1',
              'bg-foreground text-background',
              'text-[11px] font-mono font-semibold tracking-widest'
            )}
          >
            ALPHA
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-3 md:gap-4">
        <Link
          href="/docs"
          className={cn(
            'text-xs md:text-sm font-mono text-muted-foreground',
            'hover:text-foreground transition-colors',
            'px-2 py-1'
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
