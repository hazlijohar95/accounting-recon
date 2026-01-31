'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

// Define a more specific type for the children prop
type TooltipChildElement = React.ReactElement<{
  onMouseEnter?: React.MouseEventHandler
  onMouseLeave?: React.MouseEventHandler
  onFocus?: React.FocusEventHandler
  onBlur?: React.FocusEventHandler
  ref?: React.Ref<HTMLElement>
  'aria-describedby'?: string
}>

interface TooltipProps {
  /** Content to show in tooltip */
  content: React.ReactNode
  /** Element that triggers the tooltip */
  children: TooltipChildElement
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Delay before showing tooltip (ms) */
  delay?: number
  /** Custom class name for tooltip */
  className?: string
  /** Whether tooltip is disabled */
  disabled?: boolean
}

/**
 * Accessible Tooltip Component
 *
 * Shows a tooltip on hover/focus with proper accessibility.
 *
 * Features:
 * - Keyboard accessible (shows on focus)
 * - Configurable position and delay
 * - Proper ARIA attributes
 * - Smooth animation
 *
 * @example
 * ```tsx
 * <Tooltip content="Edit document" position="top">
 *   <button>
 *     <EditIcon />
 *   </button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`)

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const spacing = 8

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        y = triggerRect.top - tooltipRect.height - spacing
        break
      case 'bottom':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        y = triggerRect.bottom + spacing
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - spacing
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        break
      case 'right':
        x = triggerRect.right + spacing
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        break
    }

    // Keep tooltip within viewport
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8))
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8))

    setCoords({ x, y })
  }, [position])

  const show = useCallback(() => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }, [delay, disabled])

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }, [])

  // Recalculate position when visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition()
      window.addEventListener('scroll', calculatePosition, true)
      window.addEventListener('resize', calculatePosition)

      return () => {
        window.removeEventListener('scroll', calculatePosition, true)
        window.removeEventListener('resize', calculatePosition)
      }
    }
  }, [isVisible, calculatePosition])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Clone child to add event handlers and ref
  const childProps = children.props as {
    onMouseEnter?: React.MouseEventHandler
    onMouseLeave?: React.MouseEventHandler
    onFocus?: React.FocusEventHandler
    onBlur?: React.FocusEventHandler
  }

  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      show()
      childProps.onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide()
      childProps.onMouseLeave?.(e)
    },
    onFocus: (e: React.FocusEvent) => {
      show()
      childProps.onFocus?.(e)
    },
    onBlur: (e: React.FocusEvent) => {
      hide()
      childProps.onBlur?.(e)
    },
    'aria-describedby': isVisible ? tooltipId.current : undefined,
  } as React.HTMLAttributes<HTMLElement>)

  const positionClasses = {
    top: 'origin-bottom',
    bottom: 'origin-top',
    left: 'origin-right',
    right: 'origin-left',
  }

  return (
    <>
      {trigger}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId.current}
          role="tooltip"
          className={cn(
            'fixed z-[100] px-2 py-1 text-xs bg-foreground text-background border border-foreground shadow-lg',
            'animate-scale-in',
            positionClasses[position],
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

/**
 * Simple inline tooltip for text truncation hints
 */
interface InlineTooltipProps {
  /** Text content */
  text: string
  /** Maximum width before truncation */
  maxWidth?: string
  /** Custom class name */
  className?: string
}

export function InlineTooltip({ text, maxWidth = '200px', className }: InlineTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      const isTruncated = textRef.current.scrollWidth > textRef.current.clientWidth
      setShowTooltip(isTruncated)
    }
  }, [])

  useEffect(() => {
    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [checkTruncation, text])

  const content = (
    <span
      ref={textRef}
      className={cn('block truncate', className)}
      style={{ maxWidth }}
    >
      {text}
    </span>
  )

  if (!showTooltip) return content

  return (
    <Tooltip content={text} position="top">
      {content}
    </Tooltip>
  )
}
