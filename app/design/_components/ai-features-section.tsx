'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  AIMatchingPipeline,
  AIMatchingPipelineCompact,
  ConfidenceGauge,
  ConfidenceBar,
  ConfidenceThresholds,
  TransactionMatchAnimation,
  ReconciliationProgress,
  DataSyncPulse,
} from '@/components/brand'
import { CodeBlock } from './code-block'

function FeatureDemo({
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
      <div className="bg-muted/30 p-6 relative min-h-[200px] flex items-center justify-center">
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

function SmartCategorizationDemo() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)

  const categories = [
    { id: 'sales', label: 'Sales Revenue', count: 42 },
    { id: 'cogs', label: 'Cost of Goods', count: 28 },
    { id: 'opex', label: 'Operating Expenses', count: 15 },
    { id: 'other', label: 'Other Income', count: 8 },
  ]

  const transactions = [
    { id: 1, desc: 'Customer payment - ACME Corp', category: 'sales' },
    { id: 2, desc: 'Inventory purchase - Supplier A', category: 'cogs' },
    { id: 3, desc: 'Office supplies', category: 'opex' },
  ]

  const handleAnimate = () => {
    setAnimating(true)
    let i = 0
    const interval = setInterval(() => {
      if (i < transactions.length) {
        setActiveCategory(transactions[i].category)
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => {
          setAnimating(false)
          setActiveCategory(null)
        }, 500)
      }
    }, 600)
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Incoming transactions */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Incoming
        </span>
        <div className="space-y-1">
          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={cn(
                'px-3 py-2 bg-secondary/50 text-xs font-mono transition-all duration-300',
                animating && i === Math.floor((Date.now() / 600) % 3) && 'translate-x-2 opacity-50'
              )}
            >
              {tx.desc}
            </div>
          ))}
        </div>
      </div>

      {/* Category buckets */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={cn(
              'border border-border p-3 transition-all duration-200',
              activeCategory === cat.id && 'border-foreground bg-foreground/5'
            )}
          >
            <div className="text-xs text-muted-foreground">{cat.label}</div>
            <div className="text-lg font-mono mt-1">{cat.count}</div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAnimate}
        disabled={animating}
        className="w-full px-4 py-2 border border-border text-sm hover:bg-secondary transition-colors disabled:opacity-50"
      >
        {animating ? 'Categorizing...' : 'Run Categorization'}
      </button>
    </div>
  )
}

function MatchComparisonDemo() {
  const [showDiff, setShowDiff] = useState(false)

  const bankTx = {
    date: '2024-01-15',
    amount: 1250.0,
    description: 'ACME CORP PAYMENT',
    reference: 'TXN-789456',
  }

  const invoice = {
    date: '2024-01-15',
    amount: 1250.0,
    description: 'Invoice #1234 - ACME Corporation',
    reference: 'INV-1234',
  }

  const matches = {
    date: true,
    amount: true,
    description: false,
    reference: false,
  }

  return (
    <div className="w-full space-y-4">
      {/* Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowDiff(!showDiff)}
          className={cn(
            'px-3 py-1 text-xs border transition-colors',
            showDiff ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-secondary'
          )}
        >
          {showDiff ? 'Diff On' : 'Show Diff'}
        </button>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-2">
          <div className="text-muted-foreground uppercase tracking-wider">Bank Transaction</div>
          <div className="border border-border divide-y divide-border">
            {Object.entries(bankTx).map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  'px-3 py-2 flex justify-between',
                  showDiff && matches[key as keyof typeof matches] && 'bg-emerald-500/10',
                  showDiff && !matches[key as keyof typeof matches] && 'bg-amber-500/10'
                )}
              >
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className="font-mono">
                  {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-muted-foreground uppercase tracking-wider">Invoice</div>
          <div className="border border-border divide-y divide-border">
            {Object.entries(invoice).map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  'px-3 py-2 flex justify-between',
                  showDiff && matches[key as keyof typeof matches] && 'bg-emerald-500/10',
                  showDiff && !matches[key as keyof typeof matches] && 'bg-amber-500/10'
                )}
              >
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className="font-mono">
                  {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match summary */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/50">
        <span className="text-xs text-muted-foreground">Match score</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">85%</span>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs">Review</span>
        </div>
      </div>
    </div>
  )
}

export function AIFeaturesSection() {
  const [pipelineKey, setPipelineKey] = useState(0)
  const [matchKey, setMatchKey] = useState(0)
  const [progressKey, setProgressKey] = useState(0)

  return (
    <section id="ai-features" className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">AI Features</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Intelligent reconciliation components showcasing the 5-layer matching engine and AI-powered features.
        </p>
      </div>

      {/* 5-Layer Matching Pipeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Five-Layer Matching Pipeline
        </h3>
        <div className="border border-border p-6">
          <AIMatchingPipeline key={pipelineKey} interactive animate />
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-4">
              Click each layer to see details. Data flows through increasingly sophisticated matching algorithms
              until a confident match is found or the item is flagged for manual review.
            </p>
            <button
              onClick={() => setPipelineKey((k) => k + 1)}
              className="text-xs px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
            >
              Restart Animation
            </button>
          </div>
        </div>

        {/* Compact version */}
        <div className="border border-border p-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Compact View</span>
          <div className="mt-3">
            <AIMatchingPipelineCompact />
          </div>
        </div>
      </div>

      {/* Confidence Score Visualization */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Confidence Score Visualization
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <FeatureDemo
            title="Gauge - High"
            description="Auto-matched with 95% confidence"
          >
            <ConfidenceGauge value={95} size="lg" />
          </FeatureDemo>
          <FeatureDemo
            title="Gauge - Medium"
            description="Suggested match needs review"
          >
            <ConfidenceGauge value={78} size="lg" />
          </FeatureDemo>
          <FeatureDemo
            title="Gauge - Low"
            description="Requires manual intervention"
          >
            <ConfidenceGauge value={45} size="lg" />
          </FeatureDemo>
        </div>

        {/* Bar variant */}
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Bar Variant</h4>
          <div className="max-w-md">
            <ConfidenceBar value={92} />
          </div>
          <div className="max-w-md">
            <ConfidenceBar value={75} />
          </div>
          <div className="max-w-md">
            <ConfidenceBar value={42} />
          </div>
        </div>

        {/* Thresholds legend */}
        <div className="border border-border p-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Threshold Legend</span>
          <div className="mt-3">
            <ConfidenceThresholds />
          </div>
        </div>
      </div>

      {/* Smart Categorization */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Smart Categorization
        </h3>
        <div className="border border-border p-6">
          <SmartCategorizationDemo />
        </div>
      </div>

      {/* Match Comparison */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Match Comparison View
        </h3>
        <div className="border border-border p-6">
          <MatchComparisonDemo />
        </div>
      </div>

      {/* Transaction Match Animation */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Transaction Matching Animation
        </h3>
        <FeatureDemo
          title="Match Cascade"
          description="Visual representation of two transactions being matched"
          onReplay={() => setMatchKey((k) => k + 1)}
        >
          <TransactionMatchAnimation key={matchKey} animate />
        </FeatureDemo>
      </div>

      {/* Reconciliation Progress */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Reconciliation Progress
        </h3>
        <div className="border border-border p-6">
          <ReconciliationProgress
            key={progressKey}
            matched={847}
            pending={123}
            suspense={30}
            animate
          />
          <button
            onClick={() => setProgressKey((k) => k + 1)}
            className="mt-4 text-xs px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
          >
            Replay Animation
          </button>
        </div>
      </div>

      {/* Data Sync Status */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Sync Status Indicator
        </h3>
        <div className="border border-border p-6 flex gap-8">
          <DataSyncPulse active />
          <DataSyncPulse active={false} />
        </div>
      </div>

      {/* Usage Code */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Usage Examples
        </h3>
        <div className="border border-border p-6">
          <CodeBlock
            code={`import {
  AIMatchingPipeline,
  ConfidenceGauge,
  ConfidenceBar,
  TransactionMatchAnimation,
  ReconciliationProgress,
  DataSyncPulse,
} from '@/components/brand'

// Five-layer matching pipeline
<AIMatchingPipeline interactive animate />

// Confidence gauge (arc)
<ConfidenceGauge value={92} size="lg" showLabel />

// Confidence bar (linear)
<ConfidenceBar value={85} showValue />

// Transaction matching animation
<TransactionMatchAnimation animate onComplete={() => console.log('Done')} />

// Reconciliation progress
<ReconciliationProgress matched={847} pending={123} suspense={30} />

// Sync status indicator
<DataSyncPulse active />`}
            language="tsx"
          />
        </div>
      </div>
    </section>
  )
}
