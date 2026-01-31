import React from 'react'
import { COLORS } from '../../utils/timing'
import { FloatingDataCard, FloatingDataCardProps } from './FloatingDataCard'

interface InvoiceCardProps extends Omit<FloatingDataCardProps, 'children'> {
  /** Invoice number */
  invoiceNumber: string
  /** Vendor/customer name */
  vendor: string
  /** Invoice date */
  date: string
  /** Invoice total amount */
  total: number
  /** Invoice status */
  status?: 'pending' | 'paid' | 'overdue'
  /** Whether this card has been matched */
  matched?: boolean
}

/**
 * Invoice snippet card.
 * Displays key invoice information.
 */
export function InvoiceCard({
  invoiceNumber,
  vendor,
  date,
  total,
  status = 'pending',
  matched = false,
  ...floatingProps
}: InvoiceCardProps) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total)

  const statusColors = {
    pending: { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308' },
    paid: { bg: 'rgba(16, 185, 129, 0.2)', text: COLORS.matched },
    overdue: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  }

  return (
    <FloatingDataCard {...floatingProps}>
      {/* Invoice icon header */}
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
            backgroundColor: 'rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="14 2 14 8 20 8"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="16"
              y1="13"
              x2="8"
              y2="13"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="17"
              x2="8"
              y2="17"
              stroke="#a855f7"
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
          Invoice
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

      {/* Invoice number */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Invoice #</span>
        <div
          style={{
            fontSize: 15,
            color: COLORS.text,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {invoiceNumber}
        </div>
      </div>

      {/* Vendor */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Vendor</span>
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
          {vendor}
        </div>
      </div>

      {/* Date & Status row */}
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
        <div
          style={{
            backgroundColor: statusColors[status].bg,
            color: statusColors[status].text,
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}
        >
          {status}
        </div>
      </div>

      {/* Total */}
      <div
        style={{
          paddingTop: 8,
          borderTop: `1px solid ${COLORS.cardBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Total</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {formattedTotal}
        </span>
      </div>
    </FloatingDataCard>
  )
}
