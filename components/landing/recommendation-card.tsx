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
 * Refined action card with elegant, minimal hover effects.
 * Sharp corners, generous padding, staggered entrance.
 * Simplified to just bottom line accent on hover.
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
        'p-5 md:p-6 lg:p-8 min-h-[140px] md:min-h-[180px]',
        'bg-background border border-border/60',
        'transition-all duration-300 ease-out',
        'hover:border-foreground/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'focus-visible:border-foreground/30',
        'animate-blur-fade-in',
        'touch-manipulation',
        className
      )}
      style={{
        animationDelay: `${index * 120 + 700}ms`,
      }}
    >
      {/* Icon + Title group */}
      <div className="relative flex flex-col h-full">
        {/* Icon with refined container */}
        <div className="relative">
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-11 h-11 md:w-12 md:h-12 lg:w-14 lg:h-14',
              'bg-secondary/40 text-foreground/50',
              'transition-all duration-300',
              'group-hover:bg-foreground group-hover:text-background',
              'group-focus-visible:bg-foreground group-focus-visible:text-background'
            )}
          >
            <span className="[&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6 lg:[&>svg]:w-7 lg:[&>svg]:h-7">
              {icon}
            </span>
          </div>
        </div>

        {/* Title + Arrow */}
        <div className="flex items-end justify-between gap-3 mt-auto">
          <span
            className={cn(
              'text-base md:text-lg font-medium leading-snug',
              'text-foreground/70 transition-colors duration-300',
              'group-hover:text-foreground',
              'group-focus-visible:text-foreground'
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              'flex-shrink-0',
              'opacity-0 translate-x-[-6px]',
              'transition-all duration-300',
              'group-hover:opacity-100 group-hover:translate-x-0',
              'group-focus-visible:opacity-100 group-focus-visible:translate-x-0'
            )}
          >
            <IconArrowRight size={16} className="text-foreground/60" />
          </span>
        </div>
      </div>

      {/* Bottom line accent - simplified hover effect */}
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
