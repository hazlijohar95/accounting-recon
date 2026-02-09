'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import type { DropdownCellProps } from './types'

/**
 * Dropdown Cell Overlay
 *
 * Renders a dropdown overlay for list validation on cells.
 * Position is absolute, relative to the spreadsheet container.
 */
export function DropdownCell({
  value,
  options,
  onChange,
  position,
  isOpen,
  onClose,
  placeholder = 'Select...',
  allowClear = true,
}: DropdownCellProps) {
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options by search
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset search and highlight when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setHighlightedIndex(0)
    }
  }, [isOpen])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, filteredOptions.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredOptions[highlightedIndex]) {
            onChange(filteredOptions[highlightedIndex])
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          onClose()
          break
      }
    },
    [filteredOptions, highlightedIndex, onChange, onClose]
  )

  // Handle option select
  const handleSelect = useCallback(
    (option: string) => {
      onChange(option)
      onClose()
    },
    [onChange, onClose]
  )

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('')
    onClose()
  }, [onChange, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-background border border-border shadow-lg"
      style={{
        left: position.x,
        top: position.y + position.height,
        minWidth: Math.max(position.width, 150),
        maxWidth: 300,
      }}
    >
      {/* Search input */}
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type to search..."
          className="w-full px-2 py-1 text-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      {/* Options list */}
      <div className="max-h-48 overflow-y-auto">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No matching options
          </div>
        ) : (
          filteredOptions.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className={cn(
                'w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors',
                index === highlightedIndex && 'bg-secondary',
                option === value && 'font-medium text-foreground'
              )}
            >
              {option}
              {option === value && (
                <span className="float-right text-muted-foreground">✓</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Clear button */}
      {allowClear && value && (
        <div className="p-2 border-t border-border">
          <button
            type="button"
            onClick={handleClear}
            className="w-full px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Simple dropdown trigger button for cells
 */
export function DropdownTrigger({
  value,
  placeholder = 'Select...',
  onClick,
  hasValidation,
}: {
  value: string
  placeholder?: string
  onClick: () => void
  hasValidation?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full h-full px-2 py-1 text-left text-sm flex items-center justify-between',
        'hover:bg-secondary/50 transition-colors',
        !value && 'text-muted-foreground'
      )}
    >
      <span className="truncate">{value || placeholder}</span>
      {hasValidation && (
        <svg
          className="w-4 h-4 text-muted-foreground flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </button>
  )
}
