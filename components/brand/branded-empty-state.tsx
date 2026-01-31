'use client'

import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { LogoAnimated } from './logo-animated'
import { Logo3DLoading } from './3d/logo-3d-loading'

type EmptyStateVariant = 'upload' | 'reconcile' | 'reports' | 'generic'

interface BrandedEmptyStateProps {
  /** Visual variant determines the icon and default messaging */
  variant: EmptyStateVariant
  /** Main heading */
  title: string
  /** Supporting description */
  description: string
  /** Optional call-to-action */
  action?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
}

/**
 * Branded empty state component with animated logo and contextual messaging.
 * Uses 3D logo animation by default, falls back to 2D for reduced motion.
 */
export function BrandedEmptyState({
  variant,
  title,
  description,
  action,
  className,
}: BrandedEmptyStateProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('flex flex-col items-center justify-center h-full p-6', className)}>
      <div className="text-center max-w-md">
        {/* Animated logo as visual anchor */}
        <div className="mb-6 flex justify-center">
          {prefersReducedMotion ? (
            <LogoAnimated size={64} animate={false} />
          ) : (
            <Logo3DLoading size={120} />
          )}
        </div>

        {/* Geometric accent line */}
        <div className="flex items-center justify-center gap-1 mb-6">
          <div className="w-8 h-0.5 bg-foreground/20" />
          <div className="w-2 h-2 bg-foreground/40" />
          <div className="w-8 h-0.5 bg-foreground/20" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-medium mb-2">{title}</h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">{description}</p>

        {/* Contextual geometric illustration based on variant */}
        <div className="mb-6 flex justify-center">
          <VariantIllustration variant={variant} />
        </div>

        {/* CTA Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="px-6 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Geometric illustrations per variant using the rectangle design language
 */
function VariantIllustration({ variant }: { variant: EmptyStateVariant }) {
  const baseClass = 'text-muted-foreground/50'

  switch (variant) {
    case 'upload':
      // Document with upward arrow
      return (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className={baseClass}
        >
          {/* Document outline */}
          <rect x="10" y="8" width="28" height="32" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Upload arrow stem */}
          <rect x="22" y="20" width="4" height="14" fill="currentColor" />
          {/* Arrow head - left */}
          <rect x="16" y="22" width="8" height="4" fill="currentColor" transform="rotate(-45 20 24)" />
          {/* Arrow head - right */}
          <rect x="24" y="22" width="8" height="4" fill="currentColor" transform="rotate(45 28 24)" />
        </svg>
      )

    case 'reconcile':
      // Two rectangles with connecting lines (matching concept)
      return (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className={baseClass}
        >
          {/* Left rectangle */}
          <rect x="4" y="14" width="16" height="20" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Right rectangle */}
          <rect x="28" y="14" width="16" height="20" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Connecting arrows */}
          <rect x="20" y="22" width="8" height="2" fill="currentColor" />
          <rect x="20" y="26" width="8" height="2" fill="currentColor" />
        </svg>
      )

    case 'reports':
      // Bar chart representation
      return (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className={baseClass}
        >
          {/* Chart bars */}
          <rect x="8" y="28" width="8" height="12" fill="currentColor" />
          <rect x="20" y="18" width="8" height="22" fill="currentColor" />
          <rect x="32" y="24" width="8" height="16" fill="currentColor" />
          {/* Base line */}
          <rect x="4" y="40" width="40" height="2" fill="currentColor" />
        </svg>
      )

    case 'generic':
    default:
      // Simple grid pattern
      return (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className={baseClass}
        >
          <rect x="8" y="8" width="12" height="12" fill="currentColor" />
          <rect x="28" y="8" width="12" height="12" fill="currentColor" />
          <rect x="8" y="28" width="12" height="12" fill="currentColor" />
          <rect x="28" y="28" width="12" height="12" fill="currentColor" fillOpacity="0.5" />
        </svg>
      )
  }
}
