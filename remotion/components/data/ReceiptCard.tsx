import React from 'react'
import { COLORS } from '../../utils/timing'
import { FloatingDataCard, FloatingDataCardProps } from './FloatingDataCard'

interface ReceiptCardProps extends Omit<FloatingDataCardProps, 'children'> {
  /** Receipt ID/number */
  receiptId: string
  /** Merchant name */
  merchant: string
  /** Receipt date */
  date: string
  /** Receipt amount */
  amount: number
  /** Category */
  category?: string
  /** Whether this card has been matched */
  matched?: boolean
}

/**
 * Receipt fragment card.
 * Displays a simplified receipt representation.
 */
export function ReceiptCard({
  receiptId,
  merchant,
  date,
  amount,
  category,
  matched = false,
  ...floatingProps
}: ReceiptCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

  return (
    <FloatingDataCard {...floatingProps}>
      {/* Receipt icon header */}
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
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 2v20l4-2 4 2 4-2 4 2V2l-4 2-4-2-4 2-4-2z"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="8"
              y1="10"
              x2="16"
              y2="10"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="14"
              x2="12"
              y2="14"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
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
          Receipt
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

      {/* Receipt ID */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Receipt ID</span>
        <div
          style={{
            fontSize: 13,
            color: COLORS.textSecondary,
            fontFamily: 'monospace',
          }}
        >
          #{receiptId}
        </div>
      </div>

      {/* Merchant */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Merchant</span>
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
          {merchant}
        </div>
      </div>

      {/* Date & Category row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 12,
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Date</span>
          <div style={{ fontSize: 13, color: COLORS.text }}>{date}</div>
        </div>
        {category && (
          <div
            style={{
              backgroundColor: 'rgba(107, 114, 128, 0.2)',
              color: COLORS.textSecondary,
              fontSize: 10,
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            {category}
          </div>
        )}
      </div>

      {/* Amount */}
      <div
        style={{
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
            color: COLORS.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {formattedAmount}
        </span>
      </div>
    </FloatingDataCard>
  )
}
