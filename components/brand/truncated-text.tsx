'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface TruncatedTextProps {
  text: string
  maxWidth?: string
  className?: string
  tooltipDelay?: number
}

/**
 * Truncated Text with hover tooltip
 * Shows full text in a tooltip when content is truncated
 * - 300ms delay before showing tooltip
 * - Smooth animated appearance
 * - Only shows tooltip when text is actually truncated
 */
export function TruncatedText({
  text,
  maxWidth = '200px',
  className,
  tooltipDelay = 300,
}: TruncatedTextProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check if text is truncated
  useEffect(() => {
    const element = textRef.current
    if (element) {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }
  }, [text])

  const handleMouseEnter = useCallback(() => {
    if (!isTruncated) return
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, tooltipDelay)
  }, [isTruncated, tooltipDelay])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowTooltip(false)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <span className="relative inline-block" style={{ maxWidth }}>
      <span
        ref={textRef}
        className={cn('block truncate', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <span
          className={cn(
            'absolute z-50 left-0 top-full mt-1',
            'px-2 py-1.5 max-w-xs',
            'bg-popover text-popover-foreground text-xs',
            'border border-border shadow-md',
            'animate-fade-in-tooltip',
            'whitespace-normal break-words'
          )}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  )
}

/**
 * Tooltip for amounts - shows formatted amount on hover
 */
interface AmountTooltipProps {
  amount: number
  currency?: string
  className?: string
}

export function AmountWithTooltip({ amount, currency = 'USD', className }: AmountTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))

  const displayAmount = `${amount < 0 ? '-' : ''}${formattedAmount}`

  // Full precision for tooltip
  const preciseAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 300)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowTooltip(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <span
      className={cn('relative text-amount', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayAmount}
      {showTooltip && (
        <span className="absolute z-50 right-0 top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs border border-border shadow-md animate-fade-in-tooltip whitespace-nowrap">
          {preciseAmount}
        </span>
      )}
    </span>
  )
}
