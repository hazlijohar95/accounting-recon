'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface TransactionMatchAnimationProps {
  animate?: boolean
  onComplete?: () => void
  className?: string
}

export function TransactionMatchAnimation({
  animate = true,
  onComplete,
  className,
}: TransactionMatchAnimationProps) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!animate) {
      setStep(5)
      return
    }

    setStep(0)
    const steps = [500, 800, 300, 400, 600]
    let currentStep = 0
    let timerId: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const runStep = () => {
      if (cancelled) return
      if (currentStep < steps.length) {
        timerId = setTimeout(() => {
          if (cancelled) return
          setStep(currentStep + 1)
          currentStep++
          runStep()
        }, steps[currentStep])
      } else {
        onComplete?.()
      }
    }

    runStep()

    return () => {
      cancelled = true
      if (timerId !== null) clearTimeout(timerId)
    }
  }, [animate, onComplete])

  return (
    <div className={cn('relative w-full max-w-md mx-auto', className)}>
      {/* Bank Transaction (Left) */}
      <div
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-[45%] border border-border p-3 transition-all duration-300',
          step >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        )}
      >
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Bank
        </div>
        <div className="space-y-1 text-sm">
          <div className={cn('transition-colors', step >= 3 && 'bg-foreground/10')}>
            <span className="text-muted-foreground">Amount:</span>{' '}
            <span className="font-mono">$1,250.00</span>
          </div>
          <div className={cn('transition-colors', step >= 3 && 'bg-foreground/10')}>
            <span className="text-muted-foreground">Date:</span>{' '}
            <span className="font-mono">Jan 15</span>
          </div>
          <div>
            <span className="text-muted-foreground">Memo:</span>{' '}
            <span className="font-mono text-xs">ACME-INV-1234</span>
          </div>
        </div>
      </div>

      {/* Connection Lines */}
      <svg
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-24',
          step >= 3 ? 'opacity-100' : 'opacity-0'
        )}
        viewBox="0 0 60 80"
      >
        {/* Amount line */}
        <line
          x1="0"
          y1="20"
          x2="60"
          y2="20"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'transition-all duration-500',
            step >= 3 ? 'stroke-emerald-500' : 'stroke-transparent'
          )}
          strokeDasharray={step >= 3 ? '0' : '60'}
        />
        {/* Date line */}
        <line
          x1="0"
          y1="40"
          x2="60"
          y2="40"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'transition-all duration-500 delay-100',
            step >= 3 ? 'stroke-emerald-500' : 'stroke-transparent'
          )}
        />
      </svg>

      {/* Invoice (Right) */}
      <div
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 w-[45%] border border-border p-3 transition-all duration-300',
          step >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
        )}
      >
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Invoice
        </div>
        <div className="space-y-1 text-sm">
          <div className={cn('transition-colors', step >= 3 && 'bg-foreground/10')}>
            <span className="text-muted-foreground">Total:</span>{' '}
            <span className="font-mono">$1,250.00</span>
          </div>
          <div className={cn('transition-colors', step >= 3 && 'bg-foreground/10')}>
            <span className="text-muted-foreground">Due:</span>{' '}
            <span className="font-mono">Jan 15</span>
          </div>
          <div>
            <span className="text-muted-foreground">Ref:</span>{' '}
            <span className="font-mono text-xs">INV-1234</span>
          </div>
        </div>
      </div>

      {/* Match confirmation */}
      {step >= 4 && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 flex items-center gap-2 animate-fade-in">
          <div className="w-4 h-4 bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-background" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12L10 17L19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
              />
            </svg>
          </div>
          <span className="text-sm font-medium">Matched</span>
          <span className="text-xs text-muted-foreground font-mono">100%</span>
        </div>
      )}

      {/* Spacer for layout */}
      <div className="h-32" />
    </div>
  )
}

interface ReconciliationProgressProps {
  matched: number
  pending: number
  suspense: number
  animate?: boolean
  className?: string
}

export function ReconciliationProgress({
  matched,
  pending,
  suspense,
  animate = true,
  className,
}: ReconciliationProgressProps) {
  const [displayMatched, setDisplayMatched] = useState(animate ? 0 : matched)
  const total = matched + pending + suspense
  const matchedPercent = total > 0 ? (matched / total) * 100 : 0
  const pendingPercent = total > 0 ? (pending / total) * 100 : 0
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!animate) {
      setDisplayMatched(matched)
      return
    }

    const duration = 1500
    const start = performance.now()

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      setDisplayMatched(Math.round(matched * eased))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animateValue)
      }
    }

    frameRef.current = requestAnimationFrame(animateValue)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [matched, animate])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar */}
      <div className="h-2 bg-secondary flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${animate ? (displayMatched / total) * 100 : matchedPercent}%` }}
        />
        <div
          className="h-full bg-muted-foreground/30"
          style={{ width: `${pendingPercent}%` }}
        />
        {/* Suspense fills remainder */}
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500" />
          <span className="text-muted-foreground">Matched</span>
          <span className="font-mono">{displayMatched}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-muted-foreground/30" />
          <span className="text-muted-foreground">Pending</span>
          <span className="font-mono">{pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500" />
          <span className="text-muted-foreground">Suspense</span>
          <span className="font-mono">{suspense}</span>
        </div>
      </div>
    </div>
  )
}

interface DataSyncPulseProps {
  active?: boolean
  className?: string
}

export function DataSyncPulse({ active = true, className }: DataSyncPulseProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative w-6 h-6">
        {/* Center dot */}
        <div
          className={cn(
            'absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2',
            active ? 'bg-emerald-500' : 'bg-muted-foreground'
          )}
        />
        {/* Ripple rings */}
        {active && (
          <>
            <div className="absolute inset-0 border border-emerald-500/50 animate-ping" />
            <div
              className="absolute inset-0 border border-emerald-500/30 animate-ping"
              style={{ animationDelay: '500ms' }}
            />
          </>
        )}
      </div>
      <div className="text-sm">
        <span className={active ? 'text-emerald-500' : 'text-muted-foreground'}>
          {active ? 'Updating matches' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}

interface MatchCelebrationProps {
  show?: boolean
  onComplete?: () => void
  className?: string
}

export function MatchCelebration({
  show = false,
  onComplete,
  className,
}: MatchCelebrationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onComplete?.(), 1500)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show) return null

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center pointer-events-none z-50',
        className
      )}
    >
      {/* Checkmark burst */}
      <div className="relative animate-scale-in">
        <div className="w-16 h-16 bg-emerald-500 flex items-center justify-center">
          <svg className="w-10 h-10 text-background" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12L10 17L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="square"
              className="animate-check-draw"
            />
          </svg>
        </div>
        {/* Corner particles */}
        {[0, 90, 180, 270].map((angle, i) => (
          <div
            key={angle}
            className="absolute w-2 h-2 bg-foreground"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${angle}deg) translate(40px, 0)`,
              animation: 'scale-in 300ms ease-out forwards',
              animationDelay: `${i * 50 + 200}ms`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
