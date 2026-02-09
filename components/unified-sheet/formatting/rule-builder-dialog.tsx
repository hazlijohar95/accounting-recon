'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/cn'
import { useConditionalFormatting } from './use-conditional-formatting'
import type {
  RuleBuilderDialogProps,
  RuleType,
  ConditionOperator,
  FormatCondition,
  CellFormatting,
  PresetType,
} from './types'
import {
  OPERATOR_LABELS,
  RULE_TYPE_LABELS,
  PRESET_DESCRIPTIONS,
} from './types'

/**
 * Rule Builder Dialog
 *
 * Modal dialog for creating and editing conditional formatting rules.
 * Supports both custom rules and presets.
 */
export function RuleBuilderDialog({
  worksheetId,
  workosUserId,
  open,
  onOpenChange,
  editingRule,
  columns,
  onSave,
}: RuleBuilderDialogProps) {
  const { createRule, createPreset, updateRule } = useConditionalFormatting({
    worksheetId,
    workosUserId,
  })

  // Form state
  const [name, setName] = useState(editingRule?.name ?? '')
  const [ruleType, setRuleType] = useState<RuleType>(editingRule?.ruleType ?? 'threshold')
  const [columnIndex, setColumnIndex] = useState<number>(editingRule?.range.columnIndex ?? 0)
  const [conditions, setConditions] = useState<FormatCondition[]>(
    editingRule?.conditions ?? [
      {
        operator: 'gte' as ConditionOperator,
        value: 0,
        formatting: { backgroundColor: '#dcfce7' },
      },
    ]
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setName('')
      setRuleType('threshold')
      setColumnIndex(0)
      setConditions([
        {
          operator: 'gte',
          value: 0,
          formatting: { backgroundColor: '#dcfce7' },
        },
      ])
      setError(null)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Add a new condition
  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      {
        operator: 'gte' as ConditionOperator,
        value: 0,
        formatting: { backgroundColor: '#dbeafe' },
      },
    ])
  }, [])

  // Remove a condition
  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Update a condition
  const updateCondition = useCallback(
    (index: number, updates: Partial<FormatCondition>) => {
      setConditions((prev) =>
        prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
      )
    },
    []
  )

  // Update condition formatting
  const updateConditionFormatting = useCallback(
    (index: number, formatting: Partial<CellFormatting>) => {
      setConditions((prev) =>
        prev.map((c, i) =>
          i === index
            ? { ...c, formatting: { ...c.formatting, ...formatting } }
            : c
        )
      )
    },
    []
  )

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // For presets, use createPreset
      if (
        ruleType === 'confidenceBand' ||
        ruleType === 'statusColor' ||
        ruleType === 'matchLayer'
      ) {
        const ruleId = await createPreset(ruleType as PresetType, columnIndex, name || undefined)
        onSave?.(ruleId)
        handleOpenChange(false)
        return
      }

      // For custom rules
      if (editingRule) {
        await updateRule(editingRule._id, {
          name,
          range: { columnIndex },
          ruleType,
          conditions,
        })
        onSave?.(editingRule._id)
      } else {
        const ruleId = await createRule({
          name: name || `${RULE_TYPE_LABELS[ruleType]} Rule`,
          range: { columnIndex },
          ruleType,
          conditions,
          priority: 0,
          enabled: true,
        })
        onSave?.(ruleId)
      }

      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    ruleType,
    columnIndex,
    name,
    conditions,
    editingRule,
    createRule,
    createPreset,
    updateRule,
    onSave,
    handleOpenChange,
  ])

  const isPreset =
    ruleType === 'confidenceBand' ||
    ruleType === 'statusColor' ||
    ruleType === 'matchLayer'

  return (
    <Modal
      isOpen={open}
      onClose={() => handleOpenChange(false)}
      title={editingRule ? 'Edit Formatting Rule' : 'New Formatting Rule'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleOpenChange(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* Rule Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Rule Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Highlight High Confidence"
            className="w-full px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        {/* Rule Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Rule Type</label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as RuleType)}
            className="w-full px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <optgroup label="Custom Rules">
              <option value="threshold">Threshold (value &gt; X)</option>
              <option value="between">Between Range</option>
              <option value="equals">Exact Match</option>
              <option value="contains">Text Contains</option>
            </optgroup>
            <optgroup label="Presets">
              <option value="confidenceBand">Confidence Band</option>
              <option value="statusColor">Status Colors</option>
              <option value="matchLayer">Match Layer Colors</option>
            </optgroup>
          </select>
          {isPreset && (
            <p className="mt-1 text-xs text-muted-foreground">
              {PRESET_DESCRIPTIONS[ruleType as PresetType]}
            </p>
          )}
        </div>

        {/* Column Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Apply to Column</label>
          <select
            value={columnIndex}
            onChange={(e) => setColumnIndex(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            {columns.map((col) => (
              <option key={col.index} value={col.index}>
                {col.name} (Column {String.fromCharCode(65 + col.index)})
              </option>
            ))}
          </select>
        </div>

        {/* Custom Conditions (only for non-preset rules) */}
        {!isPreset && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Conditions</label>
              <button
                type="button"
                onClick={addCondition}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                + Add Condition
              </button>
            </div>
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <ConditionRow
                  key={index}
                  condition={condition}
                  ruleType={ruleType}
                  onUpdate={(updates) => updateCondition(index, updates)}
                  onUpdateFormatting={(formatting) =>
                    updateConditionFormatting(index, formatting)
                  }
                  onRemove={
                    conditions.length > 1
                      ? () => removeCondition(index)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/**
 * Single condition row in the rule builder
 */
function ConditionRow({
  condition,
  ruleType,
  onUpdate,
  onUpdateFormatting,
  onRemove,
}: {
  condition: FormatCondition
  ruleType: RuleType
  onUpdate: (updates: Partial<FormatCondition>) => void
  onUpdateFormatting: (formatting: Partial<CellFormatting>) => void
  onRemove?: () => void
}) {
  // Available operators based on rule type
  const availableOperators: ConditionOperator[] =
    ruleType === 'contains'
      ? ['contains', 'startsWith', 'endsWith', 'eq', 'neq']
      : ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'between']

  return (
    <div className="p-3 border border-border bg-secondary/20 space-y-3">
      <div className="flex items-center gap-2">
        {/* Operator */}
        <select
          value={condition.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as ConditionOperator })}
          className="flex-1 px-2 py-1 text-sm border border-border bg-background"
        >
          {availableOperators.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>

        {/* Value */}
        <input
          type={ruleType === 'contains' ? 'text' : 'number'}
          value={condition.value as string | number}
          onChange={(e) =>
            onUpdate({
              value: ruleType === 'contains' ? e.target.value : parseFloat(e.target.value),
            })
          }
          placeholder="Value"
          className="w-24 px-2 py-1 text-sm border border-border bg-background"
        />

        {/* Second value for between operator */}
        {condition.operator === 'between' && (
          <>
            <span className="text-sm text-muted-foreground">and</span>
            <input
              type="number"
              value={(condition.value2 as number) ?? ''}
              onChange={(e) => onUpdate({ value2: parseFloat(e.target.value) })}
              placeholder="Value 2"
              className="w-24 px-2 py-1 text-sm border border-border bg-background"
            />
          </>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-red-600"
            aria-label="Remove condition"
          >
            ×
          </button>
        )}
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground">Formatting:</label>

        {/* Background color */}
        <div className="flex items-center gap-1">
          <label className="text-xs">BG:</label>
          <input
            type="color"
            value={condition.formatting.backgroundColor ?? '#ffffff'}
            onChange={(e) => onUpdateFormatting({ backgroundColor: e.target.value })}
            className="w-8 h-6 border border-border cursor-pointer"
          />
        </div>

        {/* Text color */}
        <div className="flex items-center gap-1">
          <label className="text-xs">Text:</label>
          <input
            type="color"
            value={condition.formatting.textColor ?? '#000000'}
            onChange={(e) => onUpdateFormatting({ textColor: e.target.value })}
            className="w-8 h-6 border border-border cursor-pointer"
          />
        </div>

        {/* Bold */}
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={condition.formatting.bold ?? false}
            onChange={(e) => onUpdateFormatting({ bold: e.target.checked })}
            className="w-3 h-3"
          />
          <span className="font-bold">B</span>
        </label>

        {/* Italic */}
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={condition.formatting.italic ?? false}
            onChange={(e) => onUpdateFormatting({ italic: e.target.checked })}
            className="w-3 h-3"
          />
          <span className="italic">I</span>
        </label>
      </div>

      {/* Preview */}
      <div
        className="px-2 py-1 text-sm border border-border"
        style={{
          backgroundColor: condition.formatting.backgroundColor,
          color: condition.formatting.textColor,
          fontWeight: condition.formatting.bold ? 'bold' : undefined,
          fontStyle: condition.formatting.italic ? 'italic' : undefined,
        }}
      >
        Preview: Sample cell value
      </div>
    </div>
  )
}
