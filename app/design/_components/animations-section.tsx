'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LogoAnimated,
  LogoAnimatedWithText,
  LoadingSpinner,
  LoadingDots,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SuccessAnimation,
  SuccessCheckmark,
  ErrorAnimation,
  ErrorX,
  PageTransition,
  ConfidenceGauge,
  TransactionMatchAnimation,
  ReconciliationProgress,
  DataSyncPulse,
  MatchCelebration,
} from '@/components/brand'

function AnimationDemo({
  title,
  description,
  children,
  onReplay,
}: {
  title: string
  description: string
  children: React.ReactNode
  onReplay?: () => void
}) {
  return (
    <div className="border border-border">
      <div className="aspect-square bg-muted/30 flex items-center justify-center p-8 relative">
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

function ConfidenceFillDemo() {
  const [value, setValue] = useState(0)
  const [key, setKey] = useState(0)

  const animate = () => {
    setKey((k) => k + 1)
    setValue(0)
    setTimeout(() => setValue(92), 100)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ConfidenceGauge key={key} value={value} size="lg" animate />
      <button
        onClick={animate}
        className="text-xs px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
      >
        Animate Fill
      </button>
    </div>
  )
}

function MatchCascadeDemo() {
  const [step, setStep] = useState(0)
  const [key, setKey] = useState(0)

  const layers = ['Exact', 'Window', 'Reference', 'Fuzzy', 'LLM']

  const animate = () => {
    setKey((k) => k + 1)
    setStep(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setStep(i)
      if (i >= layers.length) {
        clearInterval(interval)
      }
    }, 400)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {layers.map((layer, idx) => (
          <div key={layer} className="flex items-center gap-1">
            <div
              className={cn(
                'px-3 py-2 border text-xs transition-all duration-300',
                step > idx
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                  : step === idx
                    ? 'border-foreground bg-foreground/5 animate-pulse'
                    : 'border-border text-muted-foreground'
              )}
            >
              {layer}
            </div>
            {idx < layers.length - 1 && (
              <div
                className={cn(
                  'w-3 h-0.5 transition-colors duration-300',
                  step > idx ? 'bg-emerald-500' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={animate}
        className="text-xs px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
      >
        Run Pipeline
      </button>
    </div>
  )
}

function NumbersAgreeAnimation() {
  const [show, setShow] = useState(false)

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setShow(true)}
        className="px-4 py-2 border border-border hover:bg-secondary transition-colors text-sm"
      >
        Trigger Match
      </button>
      <MatchCelebration show={show} onComplete={() => setShow(false)} />
      {show && (
        <span className="text-xs text-muted-foreground">Numbers agree!</span>
      )}
    </div>
  )
}

export function AnimationsSection() {
  const [logoKey, setLogoKey] = useState(0)
  const [successKey, setSuccessKey] = useState(0)
  const [errorKey, setErrorKey] = useState(0)
  const [showTransition, setShowTransition] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | 'up' | 'down'>('left')
  const [matchKey, setMatchKey] = useState(0)
  const [progressKey, setProgressKey] = useState(0)

  const triggerTransition = (dir: 'left' | 'right' | 'up' | 'down') => {
    setTransitionDirection(dir)
    setShowTransition(true)
    setTimeout(() => setShowTransition(false), 600)
  }

  return (
    <section id="animations" className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Animations</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Motion design components following the brutalist-minimal aesthetic with geometric precision.
        </p>
      </div>

      {/* Logo Animations */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Logo Animation
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <AnimationDemo
            title="Logo Reveal"
            description="Rectangle-by-rectangle reveal with staggered delays (600ms total)"
            onReplay={() => setLogoKey(k => k + 1)}
          >
            <LogoAnimated key={logoKey} size={80} />
          </AnimationDemo>
          <AnimationDemo
            title="Logo with Text"
            description="Includes wordmark fade-in after logo completes"
            onReplay={() => setLogoKey(k => k + 1)}
          >
            <LogoAnimatedWithText key={logoKey} size={48} />
          </AnimationDemo>
        </div>
      </div>

      {/* Loading States */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Loading States
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <AnimationDemo
            title="Grid Spinner"
            description="3x3 grid with wave pulse animation"
          >
            <LoadingSpinner size="lg" />
          </AnimationDemo>
          <AnimationDemo
            title="Loading Dots"
            description="Three squares with staggered pulse"
          >
            <LoadingDots />
          </AnimationDemo>
          <AnimationDemo
            title="Spinner Sizes"
            description="Available in sm, md, lg variants"
          >
            <div className="flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
          </AnimationDemo>
        </div>
      </div>

      {/* Skeleton Loaders */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Skeleton Loaders
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <AnimationDemo
            title="Basic Skeleton"
            description="Sharp-edged placeholder with shimmer"
          >
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </AnimationDemo>
          <AnimationDemo
            title="Text Skeleton"
            description="Pre-configured for text content"
          >
            <SkeletonText lines={4} className="w-full" />
          </AnimationDemo>
          <AnimationDemo
            title="Card Skeleton"
            description="Full card placeholder layout"
          >
            <SkeletonCard className="w-full" />
          </AnimationDemo>
        </div>
      </div>

      {/* Success/Error States */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Status Animations
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <AnimationDemo
            title="Success"
            description="Scale-in checkmark animation"
            onReplay={() => setSuccessKey(k => k + 1)}
          >
            <SuccessAnimation key={successKey} size={64} />
          </AnimationDemo>
          <AnimationDemo
            title="Success (Green)"
            description="With color variant"
            onReplay={() => setSuccessKey(k => k + 1)}
          >
            <SuccessAnimation key={successKey} size={64} variant="green" />
          </AnimationDemo>
          <AnimationDemo
            title="Error"
            description="X mark with shake animation"
            onReplay={() => setErrorKey(k => k + 1)}
          >
            <ErrorAnimation key={errorKey} size={64} />
          </AnimationDemo>
          <AnimationDemo
            title="Error (Red)"
            description="With destructive color"
            onReplay={() => setErrorKey(k => k + 1)}
          >
            <ErrorAnimation key={errorKey} size={64} variant="red" />
          </AnimationDemo>
        </div>
      </div>

      {/* Inline Status */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Inline Status Icons
        </h3>
        <div className="border border-border p-6 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <SuccessCheckmark size={16} />
            <span className="text-sm">Saved successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <ErrorX size={16} />
            <span className="text-sm">Failed to save</span>
          </div>
        </div>
      </div>

      {/* Page Transitions */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Page Transitions
        </h3>
        <div className="border border-border p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Venetian blind wipe effect using 6 vertical bars with staggered timing.
          </p>
          <div className="flex gap-2">
            {(['left', 'right', 'up', 'down'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => triggerTransition(dir)}
                className="px-3 py-2 text-xs border border-border hover:bg-secondary transition-colors capitalize"
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signature Animations */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Signature Feature Animations
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Transaction Match Cascade */}
          <AnimationDemo
            title="Transaction Matching"
            description="Shows two transactions being connected with field matching"
            onReplay={() => setMatchKey((k) => k + 1)}
          >
            <TransactionMatchAnimation key={matchKey} animate />
          </AnimationDemo>

          {/* Reconciliation Progress */}
          <AnimationDemo
            title="Reconciliation Progress"
            description="Animated progress bar with status breakdown"
            onReplay={() => setProgressKey((k) => k + 1)}
          >
            <div className="w-full max-w-xs">
              <ReconciliationProgress
                key={progressKey}
                matched={847}
                pending={123}
                suspense={30}
                animate
              />
            </div>
          </AnimationDemo>
        </div>

        {/* Confidence Fill */}
        <div className="border border-border p-6">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Confidence Score Fill
          </h4>
          <div className="flex items-center justify-center">
            <ConfidenceFillDemo />
          </div>
        </div>

        {/* Pipeline Animation */}
        <div className="border border-border p-6">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Matching Pipeline Flow
          </h4>
          <MatchCascadeDemo />
        </div>

        {/* Data Sync */}
        <div className="border border-border p-6">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Data Sync Pulse
          </h4>
          <div className="flex items-center gap-8">
            <DataSyncPulse active />
            <DataSyncPulse active={false} />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Ripple animation indicating real-time sync status.
          </p>
        </div>

        {/* Match Celebration */}
        <div className="border border-border p-6">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Match Confirmation
          </h4>
          <NumbersAgreeAnimation />
          <p className="text-xs text-muted-foreground mt-4">
            Subtle celebration when numbers agree. Click to preview.
          </p>
        </div>
      </div>

      {/* CSS Keyframes Reference */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Animation Classes
        </h3>
        <div className="border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Class</th>
                <th className="px-4 py-2 text-left font-medium">Duration</th>
                <th className="px-4 py-2 text-left font-medium">Easing</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-secondary px-1">animate-rectangle-reveal</code></td>
                <td className="px-4 py-2 text-muted-foreground">400ms</td>
                <td className="px-4 py-2 text-muted-foreground">ease-out</td>
                <td className="px-4 py-2 text-muted-foreground">Scale from 0 with fade</td>
              </tr>
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-secondary px-1">animate-pulse-grid</code></td>
                <td className="px-4 py-2 text-muted-foreground">1000ms</td>
                <td className="px-4 py-2 text-muted-foreground">ease-in-out</td>
                <td className="px-4 py-2 text-muted-foreground">Opacity pulse 0.3→1→0.3</td>
              </tr>
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-secondary px-1">animate-shimmer</code></td>
                <td className="px-4 py-2 text-muted-foreground">1500ms</td>
                <td className="px-4 py-2 text-muted-foreground">linear</td>
                <td className="px-4 py-2 text-muted-foreground">Translate gradient left to right</td>
              </tr>
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-secondary px-1">animate-shake</code></td>
                <td className="px-4 py-2 text-muted-foreground">500ms</td>
                <td className="px-4 py-2 text-muted-foreground">ease-in-out</td>
                <td className="px-4 py-2 text-muted-foreground">Horizontal oscillation ±4px</td>
              </tr>
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-secondary px-1">animate-scale-in</code></td>
                <td className="px-4 py-2 text-muted-foreground">300ms</td>
                <td className="px-4 py-2 text-muted-foreground">cubic-bezier</td>
                <td className="px-4 py-2 text-muted-foreground">Scale 0→1.1→1 with overshoot</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Page Transition Overlay (rendered outside normal flow) */}
      <PageTransition
        direction={transitionDirection}
        isActive={showTransition}
        onComplete={() => setShowTransition(false)}
      />
    </section>
  )
}
