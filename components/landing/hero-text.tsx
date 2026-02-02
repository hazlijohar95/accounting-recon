'use client'

import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const HERO_TEXT = "Reconciliation doesn't have to hurt."
const EMPHASIS_WORD = 'hurt'

interface HeroTextProps {
  className?: string
}

/**
 * Elegant animated hero text with refined luxury typography.
 * Uses Cormorant Garamond serif for display text.
 * Key word "hurt" is emphasized in italic.
 * Falls back to static text for reduced motion preference.
 */
export function HeroText({ className }: HeroTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const words = HERO_TEXT.replace('.', '').split(' ')

  if (prefersReducedMotion) {
    return (
      <h1 className={cn(
        'font-[family-name:var(--font-display)]',
        'text-[clamp(2rem,7vw,4.5rem)]',
        'font-light tracking-tight text-center',
        'text-foreground leading-[1.1]',
        className
      )}>
        {words.map((word, i) => (
          <span key={`word-${i}-${word}`}>
            {word === EMPHASIS_WORD ? (
              <em className="italic">{word}</em>
            ) : (
              word
            )}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
        <span className="text-foreground/50">.</span>
      </h1>
    )
  }

  return (
    <h1
      className={cn(
        'font-[family-name:var(--font-display)]',
        'text-[clamp(2rem,7vw,4.5rem)]',
        'font-light tracking-tight text-center',
        'text-foreground leading-[1.1]',
        'flex flex-wrap justify-center gap-x-[0.25em] gap-y-1',
        className
      )}
      aria-label={HERO_TEXT}
    >
      {words.map((word, wordIndex) => {
        const isEmphasis = word === EMPHASIS_WORD
        // Slower, more elegant animation timing
        const baseDelay = wordIndex * 100 + 300
        const delay = isEmphasis ? baseDelay + 80 : baseDelay

        return (
          <span
            key={`word-${wordIndex}-${word}`}
            className="inline-block overflow-hidden"
          >
            <span
              className={cn(
                'inline-block animate-blur-fade-in',
                isEmphasis && 'italic'
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
      {/* Period with subtle fade */}
      <span
        className="inline-block animate-blur-fade-in text-foreground/50"
        style={{ animationDelay: `${words.length * 100 + 500}ms` }}
      >
        .
      </span>
    </h1>
  )
}

/**
 * Fallback text shown during Suspense loading.
 */
export function FallbackText() {
  return (
    <div className="flex items-center justify-center px-4">
      <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4.5rem)] font-light tracking-tight text-center text-foreground/20 leading-[1.1]">
        {HERO_TEXT}
      </h1>
    </div>
  )
}
