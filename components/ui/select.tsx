'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { IconCaretDown, IconCheck } from '@/components/brand/icons'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Select...', className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-1.5 text-xs',
          'border border-border bg-background',
          'focus:outline-none focus:border-foreground',
          'min-w-[140px]',
          isOpen && 'border-foreground'
        )}
      >
        <span className={cn(!selectedOption && 'text-muted-foreground')}>
          {selectedOption?.label || placeholder}
        </span>
        <IconCaretDown
          size={12}
          className={cn(
            'text-muted-foreground transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full min-w-[160px]',
            'border border-border bg-background shadow-lg',
            'py-1 animate-fade-in'
          )}
          style={{ animationDuration: '150ms' }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-xs text-left',
                'hover:bg-secondary transition-colors',
                option.value === value && 'bg-secondary/50 font-medium'
              )}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <IconCheck size={12} className="text-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
