'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'

/**
 * Common Excel formulas for autocomplete
 */
const FORMULA_SUGGESTIONS = [
  { name: 'SUM', syntax: 'SUM(range)', description: 'Adds all numbers in a range' },
  { name: 'AVERAGE', syntax: 'AVERAGE(range)', description: 'Returns the average of numbers' },
  { name: 'COUNT', syntax: 'COUNT(range)', description: 'Counts cells with numbers' },
  { name: 'COUNTA', syntax: 'COUNTA(range)', description: 'Counts non-empty cells' },
  { name: 'MIN', syntax: 'MIN(range)', description: 'Returns the smallest value' },
  { name: 'MAX', syntax: 'MAX(range)', description: 'Returns the largest value' },
  { name: 'IF', syntax: 'IF(condition, true_val, false_val)', description: 'Conditional logic' },
  { name: 'SUMIF', syntax: 'SUMIF(range, criteria, sum_range)', description: 'Sum with condition' },
  { name: 'COUNTIF', syntax: 'COUNTIF(range, criteria)', description: 'Count with condition' },
  { name: 'VLOOKUP', syntax: 'VLOOKUP(value, range, col, exact)', description: 'Vertical lookup' },
  { name: 'HLOOKUP', syntax: 'HLOOKUP(value, range, row, exact)', description: 'Horizontal lookup' },
  { name: 'CONCATENATE', syntax: 'CONCATENATE(text1, text2, ...)', description: 'Join text strings' },
  { name: 'LEFT', syntax: 'LEFT(text, num_chars)', description: 'Extract left characters' },
  { name: 'RIGHT', syntax: 'RIGHT(text, num_chars)', description: 'Extract right characters' },
  { name: 'MID', syntax: 'MID(text, start, num_chars)', description: 'Extract middle characters' },
  { name: 'LEN', syntax: 'LEN(text)', description: 'Length of text' },
  { name: 'TRIM', syntax: 'TRIM(text)', description: 'Remove extra spaces' },
  { name: 'UPPER', syntax: 'UPPER(text)', description: 'Convert to uppercase' },
  { name: 'LOWER', syntax: 'LOWER(text)', description: 'Convert to lowercase' },
  { name: 'PROPER', syntax: 'PROPER(text)', description: 'Capitalize first letters' },
  { name: 'TODAY', syntax: 'TODAY()', description: 'Current date' },
  { name: 'NOW', syntax: 'NOW()', description: 'Current date and time' },
  { name: 'YEAR', syntax: 'YEAR(date)', description: 'Extract year from date' },
  { name: 'MONTH', syntax: 'MONTH(date)', description: 'Extract month from date' },
  { name: 'DAY', syntax: 'DAY(date)', description: 'Extract day from date' },
  { name: 'ROUND', syntax: 'ROUND(number, decimals)', description: 'Round a number' },
  { name: 'ROUNDUP', syntax: 'ROUNDUP(number, decimals)', description: 'Round up' },
  { name: 'ROUNDDOWN', syntax: 'ROUNDDOWN(number, decimals)', description: 'Round down' },
  { name: 'ABS', syntax: 'ABS(number)', description: 'Absolute value' },
  { name: 'AND', syntax: 'AND(condition1, condition2, ...)', description: 'All conditions true' },
  { name: 'OR', syntax: 'OR(condition1, condition2, ...)', description: 'Any condition true' },
  { name: 'NOT', syntax: 'NOT(condition)', description: 'Reverse logical value' },
]

interface FormulaBarProps {
  /** Current cell reference (e.g., "A1") */
  cellRef: string | null
  /** Current cell value or formula */
  value: string
  /** Called when value changes */
  onChange: (value: string) => void
  /** Called when Enter is pressed */
  onSubmit: () => void
  /** Called when Escape is pressed */
  onCancel: () => void
  /** Whether the formula bar is disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

/**
 * FormulaBar - Excel-like formula input bar with autocomplete
 */
export function FormulaBar({
  cellRef,
  value,
  onChange,
  onSubmit,
  onCancel,
  disabled = false,
  className,
}: FormulaBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState(FORMULA_SUGGESTIONS)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  useEffect(() => {
    if (value.startsWith('=')) {
      const formulaPart = value.slice(1).toUpperCase()
      const matches = FORMULA_SUGGESTIONS.filter((f) =>
        f.name.startsWith(formulaPart) || f.name.includes(formulaPart)
      )
      setFilteredSuggestions(matches)
      setShowSuggestions(matches.length > 0 && formulaPart.length > 0)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }, [value])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showSuggestions) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setSelectedIndex((prev) =>
              prev < filteredSuggestions.length - 1 ? prev + 1 : 0
            )
            break
          case 'ArrowUp':
            e.preventDefault()
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredSuggestions.length - 1
            )
            break
          case 'Tab':
          case 'Enter':
            if (filteredSuggestions[selectedIndex]) {
              e.preventDefault()
              const formula = filteredSuggestions[selectedIndex]
              // Insert formula name with opening parenthesis
              const newValue = `=${formula.name}(`
              onChange(newValue)
              setShowSuggestions(false)
              inputRef.current?.focus()
            } else {
              onSubmit()
            }
            break
          case 'Escape':
            setShowSuggestions(false)
            onCancel()
            break
        }
      } else {
        switch (e.key) {
          case 'Enter':
            onSubmit()
            break
          case 'Escape':
            onCancel()
            break
        }
      }
    },
    [showSuggestions, filteredSuggestions, selectedIndex, onChange, onSubmit, onCancel]
  )

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (formula: typeof FORMULA_SUGGESTIONS[0]) => {
      const newValue = `=${formula.name}(`
      onChange(newValue)
      setShowSuggestions(false)
      inputRef.current?.focus()
    },
    [onChange]
  )

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/20', className)}>
      {/* Cell reference display */}
      <div className="flex items-center justify-center min-w-[3rem] px-2 py-1 text-xs font-mono bg-background border border-border rounded">
        {cellRef || 'A1'}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Formula indicator */}
      <span className="text-xs font-medium text-muted-foreground">fx</span>

      {/* Formula input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.startsWith('=') && value.length > 1) {
              setShowSuggestions(true)
            }
          }}
          disabled={disabled}
          className={cn(
            'w-full px-2 py-1 text-sm font-mono bg-background border border-border rounded',
            'focus:outline-none focus:ring-1 focus:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
        />

        {/* Formula suggestions dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className={cn(
              'absolute top-full left-0 right-0 mt-1 z-50',
              'bg-background border border-border rounded-md shadow-lg',
              'max-h-64 overflow-y-auto'
            )}
          >
            {filteredSuggestions.map((formula, index) => (
              <button
                key={formula.name}
                onClick={() => handleSuggestionClick(formula)}
                className={cn(
                  'w-full px-3 py-2 text-left flex items-start gap-3',
                  'hover:bg-muted transition-colors',
                  index === selectedIndex && 'bg-muted'
                )}
              >
                <span className="font-mono text-sm font-medium text-primary min-w-[100px]">
                  {formula.name}
                </span>
                <div className="flex-1">
                  <div className="text-xs font-mono text-muted-foreground">
                    {formula.syntax}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formula.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onCancel}
          disabled={disabled}
          className={cn(
            'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Cancel (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className={cn(
            'p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Confirm (Enter)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default FormulaBar
