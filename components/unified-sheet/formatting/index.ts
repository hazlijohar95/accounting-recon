/**
 * Conditional Formatting Module
 *
 * Provides visual formatting rules for spreadsheet cells based on their values.
 * Includes presets for common reconciliation patterns.
 */

export * from './types'
export * from './use-conditional-formatting'
export { formattingToStyle } from './use-conditional-formatting'
export { RuleBuilderDialog } from './rule-builder-dialog'
export { ConditionalRulesPanel, FormatToolbarButton } from './conditional-rules'
