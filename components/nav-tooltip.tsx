'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface NavTooltipProps {
  label: string
  show: boolean
  children: React.ReactNode
}

export function NavTooltip({ label, show, children }: NavTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (!show) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 200)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  const handleFocus = () => {
    if (!show) return
    setIsFocused(true)
    setIsVisible(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (!timeoutRef.current) {
      setIsVisible(false)
    }
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Hide tooltip when show prop becomes false
  React.useEffect(() => {
    if (!show) {
      setIsVisible(false)
      setIsFocused(false)
    }
  }, [show])

  return (
    <div
      className="relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {show && (isVisible || isFocused) && (
        <div
          role="tooltip"
          className={cn(
            'absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50',
            'px-2 py-1 text-xs font-medium',
            'bg-popover text-popover-foreground border border-border',
            'shadow-sm whitespace-nowrap',
            'animate-tooltip-appear'
          )}
        >
          {label}
        </div>
      )}
    </div>
  )
}
