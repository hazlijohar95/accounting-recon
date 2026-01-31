'use client'

import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

export type MatchLayer = 1 | 2 | 3 | 4 | 5 | 6

interface MatchLayerBadgeProps {
  layer: MatchLayer
  size?: 'sm' | 'md'
  className?: string
}

const layerConfig: Record<MatchLayer, { label: string; color: string; bgColor: string; hasIcon?: boolean }> = {
  1: { label: 'Exact', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-500/15' },
  2: { label: 'Window', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-400/15' },
  3: { label: 'Ref', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-500/15' },
  4: { label: 'Fuzzy', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-400/15' },
  5: { label: 'AI', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-500/15', hasIcon: true },
  6: { label: 'Manual', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-500/15' },
}

/**
 * Match Layer Badge - displays which matching algorithm layer produced the match
 * Uses color coding to indicate match quality:
 * - Green (1-2): Exact/Window - high confidence deterministic matches
 * - Amber (3-4): Reference/Fuzzy - pattern-based matches
 * - Purple (5): AI/Semantic - LLM-powered semantic matching
 */
export function MatchLayerBadge({ layer, size = 'sm', className }: MatchLayerBadgeProps) {
  const config = layerConfig[layer]

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    md: 'px-2 py-1 text-xs gap-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium uppercase tracking-wider',
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {config.hasIcon && (
        <Sparkles className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      )}
      {config.label}
    </span>
  )
}

/**
 * Get the full label for a match layer
 */
export function getMatchLayerLabel(layer: number): string {
  switch (layer) {
    case 1: return 'Exact Match'
    case 2: return 'Window Match'
    case 3: return 'Reference Match'
    case 4: return 'Fuzzy Match'
    case 5: return 'AI Semantic'
    case 6: return 'Manual Match'
    default: return `Layer ${layer}`
  }
}

/**
 * Get abbreviated label for compact display
 */
export function getMatchLayerShortLabel(layer: number): string {
  return layerConfig[layer as MatchLayer]?.label ?? `L${layer}`
}
