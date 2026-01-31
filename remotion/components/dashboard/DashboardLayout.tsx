import React from 'react'
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion'
import { COLORS } from '../../utils/timing'
import { StatCard } from './StatCard'
import { ProgressBar } from './ProgressBar'

interface TransactionRow {
  id: string
  description: string
  amount: number
  status: 'matched' | 'pending' | 'suspense'
  confidence?: number
}

interface DashboardLayoutProps {
  /** Frame when dashboard appears */
  startFrame: number
  /** Cash in total */
  cashIn?: number
  /** Cash out total */
  cashOut?: number
  /** Matched percentage */
  matchedPercent?: number
  /** Suspense count */
  suspenseCount?: number
  /** Transaction rows to display */
  transactions?: TransactionRow[]
  /** Overall opacity */
  opacity?: number
}

/**
 * Clean reconciled dashboard layout.
 * Shows stats, progress, and matched transactions.
 */
export function DashboardLayout({
  startFrame,
  cashIn = 248500,
  cashOut = 187300,
  matchedPercent = 95,
  suspenseCount = 12,
  transactions = DEFAULT_TRANSACTIONS,
  opacity = 1,
}: DashboardLayoutProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const relativeFrame = frame - startFrame

  // Don't render before start
  if (relativeFrame < 0) return null

  // Overall fade in from center
  const fadeProgress = interpolate(
    relativeFrame,
    [0, 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Scale from center
  const scaleProgress = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 20, mass: 1, stiffness: 80 },
    durationInFrames: 40,
  })

  // Stagger delays for stat cards
  const statDelays = [0, 6, 12, 18]

  // Highlight sweep animation (left to right)
  const sweepProgress = interpolate(
    relativeFrame,
    [60, 90],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        opacity: opacity * fadeProgress,
        transform: `scale(${0.9 + scaleProgress * 0.1})`,
      }}
    >
      {/* Dashboard container */}
      <div
        style={{
          width: '100%',
          maxWidth: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }}
        >
          <StatCard
            label="Cash In"
            value={cashIn}
            prefix="$"
            startFrame={startFrame + statDelays[0]}
            valueColor={COLORS.matched}
            trend="up"
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2v20M17 7l-5-5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <StatCard
            label="Cash Out"
            value={cashOut}
            prefix="$"
            startFrame={startFrame + statDelays[1]}
            valueColor="#f87171"
            trend="down"
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22V2M7 17l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <StatCard
            label="Matched"
            value={matchedPercent}
            suffix="%"
            startFrame={startFrame + statDelays[2]}
            valueColor={COLORS.matched}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <StatCard
            label="Suspense"
            value={suspenseCount}
            startFrame={startFrame + statDelays[3]}
            valueColor="#f59e0b"
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </div>

        {/* Progress bar */}
        <div
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <ProgressBar
            value={matchedPercent}
            startFrame={startFrame + 24}
            height={12}
          />
        </div>

        {/* Transaction list */}
        <div
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 150px 120px 100px',
              gap: 16,
              padding: '12px 20px',
              borderBottom: `1px solid ${COLORS.cardBorder}`,
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
              Amount
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
              Status
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
              Confidence
            </span>
          </div>

          {/* Rows */}
          {transactions.slice(0, 5).map((tx, index) => {
            const rowDelay = startFrame + 30 + index * 6
            const rowProgress = interpolate(
              frame - rowDelay,
              [0, 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )

            const statusColors = {
              matched: { bg: 'rgba(16, 185, 129, 0.2)', text: COLORS.matched },
              pending: { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308' },
              suspense: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
            }

            return (
              <div
                key={tx.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px 120px 100px',
                  gap: 16,
                  padding: '14px 20px',
                  borderBottom: index < 4 ? `1px solid ${COLORS.cardBorder}` : 'none',
                  opacity: rowProgress,
                  transform: `translateY(${(1 - rowProgress) * 10}px)`,
                  position: 'relative',
                }}
              >
                {/* Highlight sweep */}
                {sweepProgress > 0 && sweepProgress < 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)`,
                      transform: `translateX(${(sweepProgress * 2 - 1) * 100}%)`,
                    }}
                  />
                )}

                <span style={{ fontSize: 14, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  ${tx.amount.toLocaleString()}
                </span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 4,
                      backgroundColor: statusColors[tx.status].bg,
                      color: statusColors[tx.status].text,
                      textTransform: 'uppercase',
                    }}
                  >
                    {tx.status}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: tx.confidence && tx.confidence >= 90 ? COLORS.matched : COLORS.textSecondary, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                  {tx.confidence ? `${tx.confidence}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Default transactions for demo
const DEFAULT_TRANSACTIONS: TransactionRow[] = [
  { id: '1', description: 'Office Supplies Co.', amount: 1250, status: 'matched', confidence: 98 },
  { id: '2', description: 'Cloud Services Monthly', amount: 4500, status: 'matched', confidence: 95 },
  { id: '3', description: 'Marketing Campaign Q4', amount: 12800, status: 'matched', confidence: 92 },
  { id: '4', description: 'Equipment Lease Payment', amount: 3200, status: 'matched', confidence: 94 },
  { id: '5', description: 'Professional Services', amount: 8750, status: 'matched', confidence: 91 },
]
