'use client'

/**
 * Inline Edit Components
 *
 * Click-to-edit functionality for transaction fields with:
 * - Tab navigation (keyboard-first)
 * - Auto-save on blur
 * - "Edited by user" badge
 * - Undo support
 *
 * @module components/inline-edit
 */

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { IconPencil, IconCheck, IconX } from '@/components/brand/icons'

// ============================================================================
// Types
// ============================================================================

interface InlineEditTextProps {
  /** Current value */
  value: string
  /** Callback when value is saved */
  onSave: (value: string) => Promise<void> | void
  /** Field type for styling */
  type?: 'text' | 'date' | 'number' | 'currency'
  /** Placeholder when empty */
  placeholder?: string
  /** Whether field was previously edited */
  wasEdited?: boolean
  /** Disable editing */
  disabled?: boolean
  /** Additional class name */
  className?: string
}

interface InlineEditNumberProps {
  /** Current value */
  value: number
  /** Callback when value is saved */
  onSave: (value: number) => Promise<void> | void
  /** Format function for display */
  formatValue?: (value: number) => string
  /** Whether field was previously edited */
  wasEdited?: boolean
  /** Disable editing */
  disabled?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// Inline Edit Text
// ============================================================================

/**
 * Inline editable text field
 * Click to edit, blur or enter to save
 */
export function InlineEditText({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit',
  wasEdited = false,
  disabled = false,
  className,
}: InlineEditTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update edit value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
      // Revert on error
      setEditValue(value)
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Tab') {
      // Let tab navigate naturally, but save first
      handleSave()
    }
  }, [handleSave, handleCancel])

  // Determine input type
  const inputType = type === 'date' ? 'date' : type === 'number' || type === 'currency' ? 'number' : 'text'

  if (disabled) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        {value || placeholder}
      </span>
    )
  }

  if (isEditing) {
    return (
      <div className={cn('inline-flex items-center gap-1', className)}>
        <input
          ref={inputRef}
          type={inputType}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={cn(
            'px-2 py-1 text-sm',
            'bg-background border border-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'min-w-[80px]',
            type === 'date' && 'w-[140px]',
            type === 'currency' && 'w-[120px] text-right font-mono tabular-nums'
          )}
        />
        {isSaving && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'group inline-flex items-center gap-1.5',
        'hover:bg-secondary/50 px-1 -mx-1 py-0.5 -my-0.5 rounded',
        'transition-colors',
        'text-left',
        className
      )}
    >
      <span className={cn(
        !value && 'text-muted-foreground italic',
        type === 'currency' && 'font-mono tabular-nums'
      )}>
        {value || placeholder}
      </span>
      <IconPencil
        size={12}
        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      />
      {wasEdited && (
        <span className="text-[10px] text-info bg-info/10 px-1 rounded">
          edited
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Inline Edit Number
// ============================================================================

/**
 * Inline editable number field
 * Specialized for currency amounts
 */
export function InlineEditNumber({
  value,
  onSave,
  formatValue = (v) => v.toLocaleString(),
  wasEdited = false,
  disabled = false,
  className,
}: InlineEditNumberProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update edit value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value))
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    const numValue = parseFloat(editValue)
    if (isNaN(numValue)) {
      setEditValue(String(value))
      setIsEditing(false)
      return
    }

    if (numValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(numValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
      setEditValue(String(value))
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = useCallback(() => {
    setEditValue(String(value))
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Tab') {
      handleSave()
    }
  }, [handleSave, handleCancel])

  if (disabled) {
    return (
      <span className={cn('font-mono tabular-nums', className)}>
        {formatValue(value)}
      </span>
    )
  }

  if (isEditing) {
    return (
      <div className={cn('inline-flex items-center gap-1', className)}>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={cn(
            'px-2 py-1 text-sm',
            'bg-background border border-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'w-[120px] text-right font-mono tabular-nums'
          )}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'group inline-flex items-center gap-1.5',
        'hover:bg-secondary/50 px-1 -mx-1 py-0.5 -my-0.5 rounded',
        'transition-colors',
        className
      )}
    >
      <span className="font-mono tabular-nums">
        {formatValue(value)}
      </span>
      <IconPencil
        size={12}
        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      />
      {wasEdited && (
        <span className="text-[10px] text-info bg-info/10 px-1 rounded">
          edited
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Selection Checkbox
// ============================================================================

/**
 * Selection checkbox for bulk operations
 */
export function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  className,
  ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  className?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        'h-4 w-4 rounded border-border',
        'text-foreground focus:ring-ring focus:ring-offset-0',
        'cursor-pointer',
        className
      )}
      aria-label={ariaLabel}
    />
  )
}

// ============================================================================
// Exports
// ============================================================================

export type { InlineEditTextProps, InlineEditNumberProps }
