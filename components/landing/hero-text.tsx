'use client'

import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const HERO_TEXT = "Reconciliation doesn't have to hurt."
const EMPHASIS_WORD = 'hurt'

interface HeroTextProps {
  className?: string
}

/**
 * Animated hero text using Geist Pixel Square for a distinctive bitmap aesthetic.
 * Key word "hurt" is emphasized with foreground opacity shift.
 * Falls back to static text for reduced motion preference.
 */
export function HeroText({ className }: HeroTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const words = HERO_TEXT.replace('.', '').split(' ')

  if (prefersReducedMotion) {
    return (
      <h1 className={cn(
        'font-[family-name:var(--font-pixel)]',
        'text-[clamp(1.75rem,6vw,3.5rem)]',
        'font-normal tracking-tight text-center',
        'text-foreground leading-[1.15]',
        className
      )}>
        {words.map((word, i) => (
          <span key={`word-${i}-${word}`}>
            {word === EMPHASIS_WORD ? (
              <span className="text-foreground/60">{word}</span>
            ) : (
              word
            )}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
        <span className="text-foreground/40">.</span>
      </h1>
    )
  }

  return (
    <h1
      className={cn(
        'font-[family-name:var(--font-pixel)]',
        'text-[clamp(1.75rem,6vw,3.5rem)]',
        'font-normal tracking-tight text-center',
        'text-foreground leading-[1.15]',
        'flex flex-wrap justify-center gap-x-[0.3em] gap-y-1',
        className
      )}
      aria-label={HERO_TEXT}
    >
      {words.map((word, wordIndex) => {
        const isEmphasis = word === EMPHASIS_WORD
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
                isEmphasis && 'text-foreground/60'
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
        className="inline-block animate-blur-fade-in text-foreground/40"
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
      <h1 className="font-[family-name:var(--font-pixel)] text-[clamp(1.75rem,6vw,3.5rem)] font-normal tracking-tight text-center text-foreground/20 leading-[1.15]">
        {HERO_TEXT}
      </h1>
    </div>
  )
}
