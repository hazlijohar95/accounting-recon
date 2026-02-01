'use client'

import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const HERO_TEXT = 'What do you want to reconcile today?'
const EMPHASIS_WORD = 'reconcile'

interface HeroTextProps {
  className?: string
}

/**
 * High-performance animated hero text using CSS transforms.
 * Each word animates in with a stagger effect.
 * The key word "reconcile" receives visual emphasis.
 * Falls back to static text for reduced motion preference.
 */
export function HeroText({ className }: HeroTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const words = HERO_TEXT.split(' ')

  if (prefersReducedMotion) {
    return (
      <h1 className={cn(
        'text-2xl sm:text-3xl md:text-5xl lg:text-6xl',
        'font-mono font-medium tracking-tight text-center',
        'text-foreground leading-tight',
        className
      )}>
        {words.map((word, i) => (
          <span key={i}>
            {word === EMPHASIS_WORD ? (
              <span className="font-semibold">{word}</span>
            ) : (
              word
            )}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>
    )
  }

  return (
    <h1
      className={cn(
        'text-2xl sm:text-3xl md:text-5xl lg:text-6xl',
        'font-mono font-medium tracking-tight text-center',
        'text-foreground leading-tight',
        'flex flex-wrap justify-center gap-x-[0.3em] gap-y-2',
        className
      )}
      aria-label={HERO_TEXT}
    >
      {words.map((word, wordIndex) => {
        const isEmphasis = word === EMPHASIS_WORD
        // Add slight extra delay before the emphasis word
        const baseDelay = wordIndex * 80 + 200
        const delay = isEmphasis ? baseDelay + 50 : baseDelay

        return (
          <span
            key={wordIndex}
            className="inline-block overflow-hidden"
          >
            <span
              className={cn(
                'inline-block animate-hero-word',
                isEmphasis && 'font-semibold text-foreground'
              )}
              style={{
                animationDelay: `${delay}ms`,
              }}
            >
              {word}
            </span>
          </span>
        )
      })}
    </h1>
  )
}

/**
 * Fallback text shown during Suspense loading.
 */
export function FallbackText() {
  return (
    <div className="flex items-center justify-center px-4">
      <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-mono font-medium tracking-tight text-center text-foreground/30 leading-tight">
        {HERO_TEXT}
      </h1>
    </div>
  )
}
