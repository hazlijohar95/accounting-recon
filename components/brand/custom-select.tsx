'use client'

/**
 * Custom Select Dropdown
 *
 * A custom select dropdown matching the Reconciled design system.
 * Features click-outside closing and keyboard support.
 *
 * @module components/brand/custom-select
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * Custom select dropdown matching design system
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  autoFocus,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Auto focus
  useEffect(() => {
    if (autoFocus) {
      setIsOpen(true)
    }
  }, [autoFocus])

  const selectedOption = options.find(o => o.value === value)
  const displayValue = selectedOption?.label || placeholder || 'Select...'

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={cn(
          'w-full px-2 py-1.5 text-sm text-left border border-border bg-background',
          'focus:outline-none focus:border-foreground transition-colors',
          'flex items-center justify-between gap-2',
          !selectedOption && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{displayValue}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg z-30 max-h-[200px] overflow-y-auto">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-2 py-1.5 text-sm text-left hover:bg-secondary transition-colors',
                value === '' && 'bg-secondary'
              )}
            >
              {placeholder}
            </button>
          )}
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-2 py-1.5 text-sm text-left hover:bg-secondary transition-colors',
                value === option.value && 'bg-secondary'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
