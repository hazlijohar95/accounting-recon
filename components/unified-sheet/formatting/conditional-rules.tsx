'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/cn'
import { useConditionalFormatting } from './use-conditional-formatting'
import { RuleBuilderDialog } from './rule-builder-dialog'
import type {
  ConditionalRulesPanelProps,
  ConditionalFormatRule,
  PresetType,
} from './types'
import { RULE_TYPE_LABELS, PRESET_DESCRIPTIONS } from './types'

/**
 * Conditional Rules Panel
 *
 * Side panel for viewing and managing conditional formatting rules.
 * Includes quick preset application and full rule editing.
 */
export function ConditionalRulesPanel({
  worksheetId,
  workosUserId,
  open,
  onOpenChange,
  columns,
}: ConditionalRulesPanelProps) {
  const {
    rules,
    isLoading,
    createPreset,
    toggleRule,
    deleteRule,
  } = useConditionalFormatting({
    worksheetId,
    workosUserId,
    enabledOnly: false, // Show all rules in panel
  })

  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<ConditionalFormatRule | undefined>()
  const [expandedPresets, setExpandedPresets] = useState(true)

  // Open rule builder for editing
  const handleEdit = useCallback((rule: ConditionalFormatRule) => {
    setEditingRule(rule)
    setShowRuleBuilder(true)
  }, [])

  // Open rule builder for new rule
  const handleNewRule = useCallback(() => {
    setEditingRule(undefined)
    setShowRuleBuilder(true)
  }, [])

  // Handle preset application
  const handleApplyPreset = useCallback(
    async (preset: PresetType, columnIndex: number) => {
      try {
        await createPreset(preset, columnIndex)
      } catch (err) {
        console.error('Failed to apply preset:', err)
      }
    },
    [createPreset]
  )

  if (!open) return null

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-lg z-40',
          'transform transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Conditional Formatting</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-120px)]">
          {/* Quick Presets Section */}
          <div className="border-b border-border">
            <button
              onClick={() => setExpandedPresets(!expandedPresets)}
              className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left hover:bg-secondary/50"
            >
              <span>Quick Presets</span>
              <svg
                className={cn('w-4 h-4 transition-transform', expandedPresets && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedPresets && (
              <div className="px-4 pb-3 space-y-2">
                {(['confidenceBand', 'statusColor', 'matchLayer'] as PresetType[]).map(
                  (preset) => (
                    <PresetCard
                      key={preset}
                      preset={preset}
                      columns={columns}
                      onApply={(columnIndex) => handleApplyPreset(preset, columnIndex)}
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* Active Rules Section */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Active Rules</h3>
              <button
                onClick={handleNewRule}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                + New Rule
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No formatting rules yet.<br />
                Use a preset or create a custom rule.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule._id}
                    rule={rule}
                    columns={columns}
                    onEdit={() => handleEdit(rule)}
                    onToggle={() => toggleRule(rule._id)}
                    onDelete={() => deleteRule(rule._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-border bg-background">
          <button
            onClick={handleNewRule}
            className="w-full px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Create Custom Rule
          </button>
        </div>
      </div>

      {/* Rule Builder Dialog */}
      <RuleBuilderDialog
        worksheetId={worksheetId}
        workosUserId={workosUserId}
        open={showRuleBuilder}
        onOpenChange={setShowRuleBuilder}
        editingRule={editingRule}
        columns={columns}
      />
    </>
  )
}

/**
 * Preset card for quick application
 */
function PresetCard({
  preset,
  columns,
  onApply,
}: {
  preset: PresetType
  columns: Array<{ index: number; name: string }>
  onApply: (columnIndex: number) => void
}) {
  const [selectedColumn, setSelectedColumn] = useState(0)
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    setIsApplying(true)
    try {
      await onApply(selectedColumn)
    } finally {
      setIsApplying(false)
    }
  }

  const label = RULE_TYPE_LABELS[preset].replace(' (Preset)', '')
  const colors = getPresetPreviewColors(preset)

  return (
    <div className="p-2 border border-border bg-secondary/20 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{label}</span>
        <div className="flex gap-1">
          {colors.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 border border-border"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <p className="text-muted-foreground mb-2">{PRESET_DESCRIPTIONS[preset]}</p>
      <div className="flex items-center gap-2">
        <select
          value={selectedColumn}
          onChange={(e) => setSelectedColumn(parseInt(e.target.value))}
          className="flex-1 px-2 py-1 border border-border bg-background text-xs"
        >
          {columns.map((col) => (
            <option key={col.index} value={col.index}>
              {col.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleApply}
          disabled={isApplying}
          className="px-2 py-1 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {isApplying ? '...' : 'Apply'}
        </button>
      </div>
    </div>
  )
}

/**
 * Single rule card in the rules list
 */
function RuleCard({
  rule,
  columns,
  onEdit,
  onToggle,
  onDelete,
}: {
  rule: ConditionalFormatRule
  columns: Array<{ index: number; name: string }>
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const [showDelete, setShowDelete] = useState(false)

  const columnName =
    rule.range.columnIndex !== undefined
      ? columns.find((c) => c.index === rule.range.columnIndex)?.name ?? `Column ${rule.range.columnIndex}`
      : 'All columns'

  return (
    <div
      className={cn(
        'p-2 border border-border text-xs',
        !rule.enabled && 'opacity-50 bg-secondary/20'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium truncate">{rule.name}</span>
        <div className="flex items-center gap-1">
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={cn(
              'px-1.5 py-0.5 text-[10px] border',
              rule.enabled
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-border bg-background text-muted-foreground'
            )}
          >
            {rule.enabled ? 'ON' : 'OFF'}
          </button>
          {/* Edit */}
          <button
            onClick={onEdit}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Edit rule"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={() => setShowDelete(true)}
            className="p-1 text-muted-foreground hover:text-red-600"
            aria-label="Delete rule"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="text-muted-foreground">
        <span className="inline-block px-1 py-0.5 mr-1 bg-secondary text-[10px]">
          {RULE_TYPE_LABELS[rule.ruleType]}
        </span>
        <span>→ {columnName}</span>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="mt-2 p-2 border border-red-200 bg-red-50">
          <p className="text-red-700 mb-2">Delete this rule?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete()
                setShowDelete(false)
              }}
              className="px-2 py-1 bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="px-2 py-1 border border-border hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get preview colors for a preset
 */
function getPresetPreviewColors(preset: PresetType): string[] {
  switch (preset) {
    case 'confidenceBand':
      return ['#dcfce7', '#fef3c7', '#fee2e2'] // green, amber, red
    case 'statusColor':
      return ['#dcfce7', '#dbeafe', '#fef3c7', '#fee2e2'] // green, blue, amber, red
    case 'matchLayer':
      return ['#dcfce7', '#e0f2fe', '#f3e8ff', '#fef3c7', '#fce7f3', '#dbeafe']
    default:
      return ['#dbeafe']
  }
}

/**
 * Toolbar button for opening the conditional formatting panel
 */
export function FormatToolbarButton({
  onClick,
  hasRules,
}: {
  onClick: () => void
  hasRules?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 text-xs border border-border hover:bg-secondary/50 transition-colors',
        hasRules && 'border-blue-300 bg-blue-50'
      )}
      title="Conditional Formatting"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
      <span>Format</span>
      {hasRules && (
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
      )}
    </button>
  )
}
