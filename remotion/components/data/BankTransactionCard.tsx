import React from 'react'
import { COLORS } from '../../utils/timing'
import { FloatingDataCard, FloatingDataCardProps } from './FloatingDataCard'

interface BankTransactionCardProps extends Omit<FloatingDataCardProps, 'children'> {
  /** Transaction date */
  date: string
  /** Transaction description */
  description: string
  /** Transaction amount (negative for debits) */
  amount: number
  /** Transaction reference */
  reference?: string
  /** Whether this card has been matched */
  matched?: boolean
}

/**
 * Bank transaction row card.
 * Displays a single bank statement line item.
 */
export function BankTransactionCard({
  date,
  description,
  amount,
  reference,
  matched = false,
  ...floatingProps
}: BankTransactionCardProps) {
  const isCredit = amount >= 0
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'always',
  }).format(amount)

  return (
    <FloatingDataCard {...floatingProps}>
      {/* Bank icon header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${COLORS.cardBorder}`,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Bank Transaction
        </span>
        {matched && (
          <div
            style={{
              marginLeft: 'auto',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: COLORS.matched,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            MATCHED
          </div>
        )}
      </div>

      {/* Date */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Date</span>
        <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 500 }}>{date}</div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Description</span>
        <div
          style={{
            fontSize: 14,
            color: COLORS.text,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description}
        </div>
      </div>

      {/* Reference (optional) */}
      {reference && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Reference</span>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'monospace' }}>
            {reference}
          </div>
        </div>
      )}

      {/* Amount */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: `1px solid ${COLORS.cardBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Amount</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: isCredit ? COLORS.matched : '#f87171',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {formattedAmount}
        </span>
      </div>
    </FloatingDataCard>
  )
}
