'use client'

import { cn } from '@/lib/utils'

interface DemoCardProps {
  title: string
  description: string
  children: React.ReactNode
  onReplay?: () => void
  /** Use aspect-square for animation demos, or min-height for feature demos */
  variant?: 'animation' | 'feature' | '3d'
  className?: string
}

/**
 * Shared demo card for design system sections.
 * Consolidates AnimationDemo, FeatureDemo, and Demo3DCard.
 */
export function DemoCard({
  title,
  description,
  children,
  onReplay,
  variant = 'feature',
  className,
}: DemoCardProps) {
  const previewClasses = cn(
    'bg-muted/30 flex items-center justify-center relative',
    variant === 'animation' && 'aspect-square p-8',
    variant === 'feature' && 'p-6 min-h-[200px]',
    variant === '3d' && 'p-4 min-h-[300px] bg-muted/20',
  )

  return (
    <div className={cn('border border-border', className)}>
      <div className={previewClasses}>
        {children}
        {onReplay && (
          <button
            onClick={onReplay}
            className="absolute bottom-2 right-2 text-xs px-2 py-1 border border-border bg-background hover:bg-secondary transition-colors"
          >
            Replay
          </button>
        )}
      </div>
      <div className="p-4 border-t border-border">
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
