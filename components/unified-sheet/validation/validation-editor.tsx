'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import type { ValidationRule, ValidationType, PresetValidationKey } from './types'
import { PRESET_VALIDATION_LISTS } from './types'

interface ValidationEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  validation?: ValidationRule
  onSave: (validation: ValidationRule | undefined) => void
  columnName: string
}

/**
 * Validation Editor Dialog
 *
 * Modal for configuring column validation rules.
 */
export function ValidationEditorDialog({
  open,
  onOpenChange,
  validation,
  onSave,
  columnName,
}: ValidationEditorDialogProps) {
  // Form state
  const [type, setType] = useState<ValidationType>(validation?.type ?? 'list')
  const [allowedValues, setAllowedValues] = useState<string[]>(
    validation?.allowedValues ?? []
  )
  const [min, setMin] = useState<number | undefined>(validation?.min)
  const [max, setMax] = useState<number | undefined>(validation?.max)
  const [pattern, setPattern] = useState<string>(validation?.pattern ?? '')
  const [required, setRequired] = useState(validation?.required ?? false)
  const [errorMessage, setErrorMessage] = useState(validation?.errorMessage ?? '')
  const [customValue, setCustomValue] = useState('')

  // Reset form when opening
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset to current validation values
      setType(validation?.type ?? 'list')
      setAllowedValues(validation?.allowedValues ?? [])
      setMin(validation?.min)
      setMax(validation?.max)
      setPattern(validation?.pattern ?? '')
      setRequired(validation?.required ?? false)
      setErrorMessage(validation?.errorMessage ?? '')
      setCustomValue('')
    }
    onOpenChange(newOpen)
  }, [validation, onOpenChange])

  // Apply preset list
  const applyPreset = useCallback((presetKey: PresetValidationKey) => {
    const preset = PRESET_VALIDATION_LISTS[presetKey]
    setAllowedValues([...preset.values])
    setType('list')
  }, [])

  // Add custom value to list
  const addCustomValue = useCallback(() => {
    if (customValue.trim() && !allowedValues.includes(customValue.trim())) {
      setAllowedValues([...allowedValues, customValue.trim()])
      setCustomValue('')
    }
  }, [customValue, allowedValues])

  // Remove value from list
  const removeValue = useCallback((value: string) => {
    setAllowedValues(allowedValues.filter((v) => v !== value))
  }, [allowedValues])

  // Handle save
  const handleSave = useCallback(() => {
    // Build validation rule
    const rule: ValidationRule = {
      type,
      required,
      errorMessage: errorMessage || undefined,
    }

    if (type === 'list' && allowedValues.length > 0) {
      rule.allowedValues = allowedValues
    }

    if (type === 'number' || type === 'text') {
      if (min !== undefined) rule.min = min
      if (max !== undefined) rule.max = max
    }

    if (type === 'text' && pattern) {
      rule.pattern = pattern
    }

    onSave(rule)
    handleOpenChange(false)
  }, [
    type,
    allowedValues,
    min,
    max,
    pattern,
    required,
    errorMessage,
    onSave,
    handleOpenChange,
  ])

  // Handle remove validation
  const handleRemove = useCallback(() => {
    onSave(undefined)
    handleOpenChange(false)
  }, [onSave, handleOpenChange])

  return (
    <Modal
      isOpen={open}
      onClose={() => handleOpenChange(false)}
      title={`Data Validation: ${columnName}`}
      size="lg"
      footer={
        <div className="flex justify-between">
          <button
            onClick={handleRemove}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
          >
            Remove Validation
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleOpenChange(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90"
            >
              Save
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Validation Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Validation Type</label>
          <div className="grid grid-cols-4 gap-2">
            {(['list', 'number', 'date', 'text'] as ValidationType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 text-sm border capitalize ${
                  type === t
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* List Type Options */}
        {type === 'list' && (
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <label className="block text-sm font-medium mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRESET_VALIDATION_LISTS) as PresetValidationKey[]).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      className="px-2 py-1 text-xs border border-border hover:bg-secondary"
                    >
                      {PRESET_VALIDATION_LISTS[key].name}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Allowed Values */}
            <div>
              <label className="block text-sm font-medium mb-2">Allowed Values</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomValue()}
                  placeholder="Add custom value..."
                  className="flex-1 px-3 py-2 text-sm border border-border bg-background"
                />
                <button
                  type="button"
                  onClick={addCustomValue}
                  className="px-3 py-2 text-sm border border-border hover:bg-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedValues.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-secondary"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => removeValue(value)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {allowedValues.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No values added yet
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Number Type Options */}
        {type === 'number' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Minimum</label>
              <input
                type="number"
                value={min ?? ''}
                onChange={(e) =>
                  setMin(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="No minimum"
                className="w-full px-3 py-2 text-sm border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maximum</label>
              <input
                type="number"
                value={max ?? ''}
                onChange={(e) =>
                  setMax(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="No maximum"
                className="w-full px-3 py-2 text-sm border border-border bg-background"
              />
            </div>
          </div>
        )}

        {/* Text Type Options */}
        {type === 'text' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Length
                </label>
                <input
                  type="number"
                  value={min ?? ''}
                  onChange={(e) =>
                    setMin(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="No minimum"
                  className="w-full px-3 py-2 text-sm border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  value={max ?? ''}
                  onChange={(e) =>
                    setMax(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="No maximum"
                  className="w-full px-3 py-2 text-sm border border-border bg-background"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Pattern (Regex)
              </label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g., ^[A-Z0-9]+$"
                className="w-full px-3 py-2 text-sm border border-border bg-background font-mono"
              />
            </div>
          </div>
        )}

        {/* Common Options */}
        <div className="space-y-3 pt-4 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Required field (cannot be empty)</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">
              Custom Error Message
            </label>
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Optional custom message shown on validation failure"
              className="w-full px-3 py-2 text-sm border border-border bg-background"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
