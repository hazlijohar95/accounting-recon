'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface MatchingLayer {
  id: string
  name: string
  shortName: string
  description: string
  example: string
  threshold: string
}

const matchingLayers: MatchingLayer[] = [
  {
    id: 'exact',
    name: 'Exact Match',
    shortName: 'Exact',
    description: 'Perfect amount and date match between bank transaction and invoice.',
    example: '$1,250.00 on Jan 15 matches Invoice #1234 for $1,250.00',
    threshold: '100%',
  },
  {
    id: 'window',
    name: 'Window Match',
    shortName: 'Window',
    description: 'Same amount with a ±3 day tolerance for posting delays.',
    example: 'Bank: Jan 18, Invoice: Jan 15 (3 day difference)',
    threshold: '±3 days',
  },
  {
    id: 'reference',
    name: 'Reference Match',
    shortName: 'Reference',
    description: 'Matches invoice numbers, PO references, or customer IDs.',
    example: 'Bank memo "INV-1234" matches Invoice #INV-1234',
    threshold: 'INV-XXX',
  },
  {
    id: 'fuzzy',
    name: 'Fuzzy Match',
    shortName: 'Fuzzy',
    description: 'Partial matches using text similarity and amount proximity.',
    example: '"ACME Corp Payment" ~85% similar to "ACME Corporation"',
    threshold: '~85%',
  },
  {
    id: 'llm',
    name: 'LLM Semantic',
    shortName: 'LLM',
    description: 'AI-powered semantic understanding for complex matches.',
    example: '"Q4 subscription renewal" matched to recurring invoice',
    threshold: 'AI',
  },
]

interface AIMatchingPipelineProps {
  interactive?: boolean
  animate?: boolean
  className?: string
}

export function AIMatchingPipeline({
  interactive = true,
  animate = true,
  className,
}: AIMatchingPipelineProps) {
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [animatedIndex, setAnimatedIndex] = useState(-1)

  // Animate data flowing through layers
  useState(() => {
    if (!animate) return
    let index = 0
    const interval = setInterval(() => {
      setAnimatedIndex(index)
      index = (index + 1) % (matchingLayers.length + 1)
      if (index === 0) setAnimatedIndex(-1)
    }, 800)
    return () => clearInterval(interval)
  })

  return (
    <div className={cn('space-y-6', className)}>
      {/* Pipeline visualization */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {matchingLayers.map((layer, index) => (
          <div key={layer.id} className="flex items-center">
            {/* Layer box */}
            <button
              onClick={() => interactive && setActiveLayer(layer.id === activeLayer ? null : layer.id)}
              className={cn(
                'relative flex flex-col items-center justify-center p-4 border transition-all min-w-[100px]',
                activeLayer === layer.id
                  ? 'border-foreground bg-secondary'
                  : 'border-border hover:border-muted-foreground',
                animatedIndex === index && 'border-foreground bg-foreground/5'
              )}
            >
              <span className="text-sm font-medium">{layer.shortName}</span>
              <span className="text-xs text-muted-foreground mt-1">{layer.threshold}</span>
              {animatedIndex === index && (
                <div className="absolute inset-0 border-2 border-foreground animate-pulse" />
              )}
            </button>

            {/* Arrow between layers */}
            {index < matchingLayers.length - 1 && (
              <div className="flex items-center px-1">
                <div
                  className={cn(
                    'w-4 h-0.5 transition-colors',
                    animatedIndex === index ? 'bg-foreground' : 'bg-border'
                  )}
                />
                <div
                  className={cn(
                    'w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent transition-colors',
                    animatedIndex === index ? 'border-l-foreground' : 'border-l-border'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Layer detail panel */}
      {activeLayer && (
        <div className="border border-border p-4 animate-fade-in">
          {matchingLayers
            .filter((l) => l.id === activeLayer)
            .map((layer) => (
              <div key={layer.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{layer.name}</h4>
                  <span className="px-2 py-0.5 bg-secondary text-xs font-mono">
                    {layer.threshold}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{layer.description}</p>
                <div className="bg-secondary/50 p-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Example
                  </span>
                  <p className="text-xs mt-1 font-mono">{layer.example}</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

interface PipelineCompactProps {
  className?: string
}

export function AIMatchingPipelineCompact({ className }: PipelineCompactProps) {
  return (
    <div className={cn('flex items-center gap-1 text-xs', className)}>
      {matchingLayers.map((layer, index) => (
        <div key={layer.id} className="flex items-center gap-1">
          <span className="px-2 py-1 bg-secondary font-mono">{layer.shortName}</span>
          {index < matchingLayers.length - 1 && (
            <span className="text-muted-foreground">&rarr;</span>
          )}
        </div>
      ))}
    </div>
  )
}

interface MatchingStepIndicatorProps {
  currentStep: number
  className?: string
}

export function MatchingStepIndicator({
  currentStep,
  className,
}: MatchingStepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {matchingLayers.map((layer, index) => (
        <div
          key={layer.id}
          className={cn(
            'w-2 h-2 transition-colors',
            index < currentStep
              ? 'bg-emerald-500'
              : index === currentStep
                ? 'bg-foreground animate-pulse'
                : 'bg-secondary'
          )}
          title={layer.name}
        />
      ))}
    </div>
  )
}
