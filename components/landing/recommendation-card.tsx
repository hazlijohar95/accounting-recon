'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { IconArrowRight } from '@/components/brand'

interface RecommendationCardProps {
  title: string
  icon: React.ReactNode
  href: string
  index: number
  className?: string
}

/**
 * Premium action card with geometric hover effects.
 * Sharp corners, layered borders, staggered entrance.
 * Enhanced with shadow lift, focus states, and grouped icon/title hover.
 */
export function RecommendationCard({
  title,
  icon,
  href,
  index,
  className,
}: RecommendationCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col justify-between',
        'p-4 md:p-5 lg:p-6 min-h-[120px] md:min-h-[160px]',
        'bg-background border border-border',
        'landing-card',
        'hover:border-foreground hover:bg-surface-interactive-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'focus-visible:border-foreground focus-visible:bg-surface-interactive-hover',
        'animate-card-entrance',
        // Touch feedback for mobile
        'active:scale-[0.98] active:transition-transform active:duration-75',
        'touch-manipulation',
        className
      )}
      style={{
        animationDelay: `${index * 100 + 600}ms`,
      }}
    >
      {/* Corner accent - appears on hover/focus */}
      <div
        className={cn(
          'absolute top-0 right-0 w-0 h-0',
          'border-t-[24px] border-r-[24px]',
          'border-t-transparent border-r-foreground/0',
          'transition-all duration-300',
          'group-hover:border-r-foreground/20',
          'group-focus-visible:border-r-foreground/20'
        )}
        aria-hidden="true"
      />

      {/* Background gradient sweep on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0',
          'bg-gradient-to-br from-foreground/[0.02] to-transparent',
          'transition-opacity duration-300',
          'group-hover:opacity-100',
          'group-focus-visible:opacity-100'
        )}
        aria-hidden="true"
      />

      {/* Icon + Title group with shared hover behavior */}
      <div className="relative flex flex-col h-full">
        {/* Icon with geometric container */}
        <div className="relative">
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14',
              'bg-secondary/50 text-foreground/60',
              'transition-all duration-300',
              'group-hover:bg-foreground group-hover:text-background',
              'group-hover:translate-x-1 group-hover:-translate-y-1',
              'group-hover:scale-[1.02]',
              'group-focus-visible:bg-foreground group-focus-visible:text-background',
              'group-focus-visible:translate-x-1 group-focus-visible:-translate-y-1'
            )}
          >
            {/* Icon scales responsively: 20px mobile, 24px tablet, 28px desktop */}
            <span className="[&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6 lg:[&>svg]:w-7 lg:[&>svg]:h-7">
              {icon}
            </span>
          </div>
        </div>

        {/* Title + Arrow - grouped with icon hover state */}
        <div className="flex items-end justify-between gap-2 md:gap-3 mt-auto">
          <span
            className={cn(
              'text-base font-medium leading-snug',
              'text-foreground/80 transition-colors duration-300',
              'group-hover:text-foreground',
              'group-focus-visible:text-foreground'
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              'flex-shrink-0',
              'opacity-0 translate-x-[-8px]',
              'transition-all duration-300',
              'group-hover:opacity-100 group-hover:translate-x-0',
              'group-focus-visible:opacity-100 group-focus-visible:translate-x-0'
            )}
          >
            <IconArrowRight size={16} className="text-foreground" />
          </span>
        </div>
      </div>

      {/* Bottom line accent */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-[2px]',
          'bg-foreground origin-left scale-x-0',
          'transition-transform duration-300',
          'group-hover:scale-x-100',
          'group-focus-visible:scale-x-100'
        )}
        aria-hidden="true"
      />
    </Link>
  )
}
