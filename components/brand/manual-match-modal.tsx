'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { IconX, IconSearch, IconFileText, IconWarningCircle, IconArrowDown } from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import {
  Transaction,
  AccrualDocument,
  MatchConfidence,
  useAccrualDocumentsSafe,
  useCreateManualMatch,
  useIsDemo,
} from '@/lib/store'
import { ButtonPrimary, ButtonSecondary } from './premium-button'
import { TruncatedText } from './truncated-text'

interface ManualMatchModalProps {
  suspenseItem: Transaction
  onClose: () => void
  onMatchCreated?: () => void
}

type ConfidenceLevel = 'high' | 'medium' | 'low'

interface ModalState {
  searchQuery: string
  selectedCandidateId: string | null
  selectedCandidateIds: string[] // For multi-select partial match mode
  confidence: ConfidenceLevel
  isCreating: boolean
  error: string | null
  partialMatchMode: boolean // Toggle for partial match mode
}

// Shared tolerance constant (15% = 0.15 in decimal)
const AMOUNT_TOLERANCE = 0.15

/**
 * ManualMatchModal - Modal for manually matching suspense items to accrual documents
 *
 * Design:
 * - No rounded corners (geometric brand)
 * - Border styling: border border-border
 * - Blue accent for manual matches
 * - Fade-in animation with reduced-motion support
 */
export function ManualMatchModal({ suspenseItem, onClose, onMatchCreated }: ManualMatchModalProps) {
  // Mode-aware selector - automatically returns correct data based on isDemo
  const accrualDocuments = useAccrualDocumentsSafe()
  const createManualMatch = useCreateManualMatch()
  const isDemo = useIsDemo()
  const modalRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<ModalState>({
    searchQuery: '',
    selectedCandidateId: null,
    selectedCandidateIds: [],
    confidence: 'medium',
    isCreating: false,
    error: null,
    partialMatchMode: false,
  })

  // Memoized candidates calculation for performance
  const candidates = useMemo(() => {
    const targetAmount = Math.abs(suspenseItem.amount)

    return accrualDocuments
      .filter((doc) => {
        // Only show pending documents
        if (doc.status !== 'pending') return false

        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase()
          const matchesQuery =
            doc.docNumber?.toLowerCase().includes(query) ||
            doc.counterparty?.toLowerCase().includes(query) ||
            doc.description?.toLowerCase().includes(query)
          if (!matchesQuery) return false
        }

        return true
      })
      .map((doc) => {
        const docAmount = Math.abs(doc.amount)
        const amountDiff = Math.abs(docAmount - targetAmount)

        // Handle zero-amount edge case
        let percentDiff: number
        if (targetAmount === 0 && docAmount === 0) {
          percentDiff = 0 // Both zero = exact match
        } else if (targetAmount === 0) {
          percentDiff = 1 // Target is zero but doc is not
        } else {
          percentDiff = amountDiff / targetAmount
        }

        return {
          ...doc,
          amountDiff,
          percentDiff,
          isWithinTolerance: percentDiff <= AMOUNT_TOLERANCE,
          isExactMatch: amountDiff === 0,
        }
      })
      .sort((a, b) => a.amountDiff - b.amountDiff)
  }, [accrualDocuments, suspenseItem.amount, state.searchQuery])

  // Computed values for partial match mode
  const selectedCandidates = useMemo(() => {
    if (!state.partialMatchMode) return []
    return candidates.filter((c) => state.selectedCandidateIds.includes(c.id))
  }, [candidates, state.selectedCandidateIds, state.partialMatchMode])

  const partialMatchTotals = useMemo(() => {
    const targetAmount = Math.abs(suspenseItem.amount)
    const selectedTotal = selectedCandidates.reduce((sum, c) => sum + Math.abs(c.amount), 0)
    const variance = targetAmount - selectedTotal
    const variancePercent = targetAmount > 0 ? Math.abs(variance) / targetAmount : 0
    const isWithinTolerance = variancePercent <= AMOUNT_TOLERANCE
    const isExact = Math.abs(variance) < 0.01

    return {
      targetAmount,
      selectedTotal,
      variance,
      variancePercent,
      isWithinTolerance,
      isExact,
    }
  }, [selectedCandidates, suspenseItem.amount])

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Focus trap for accessibility
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement?.focus()
        e.preventDefault()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement?.focus()
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [])

  // Toggle candidate selection in multi-select mode
  const toggleCandidateSelection = (candidateId: string) => {
    setState((s) => {
      if (s.selectedCandidateIds.includes(candidateId)) {
        return {
          ...s,
          selectedCandidateIds: s.selectedCandidateIds.filter((id) => id !== candidateId),
          error: null,
        }
      } else {
        return {
          ...s,
          selectedCandidateIds: [...s.selectedCandidateIds, candidateId],
          error: null,
        }
      }
    })
  }

  // Handle single candidate selection (non-partial mode)
  const handleSingleSelect = (candidateId: string) => {
    setState((s) => ({ ...s, selectedCandidateId: candidateId, error: null }))
  }

  const handleCreateMatch = async () => {
    // Partial match mode - create partial matches
    if (state.partialMatchMode) {
      if (state.selectedCandidateIds.length < 2) {
        setState((s) => ({
          ...s,
          error: 'Select at least 2 documents for a partial match.',
        }))
        return
      }

      // Validate all selected candidates still exist and are pending
      const validCandidates = selectedCandidates.filter((c) => c.status === 'pending')
      if (validCandidates.length !== state.selectedCandidateIds.length) {
        setState((s) => ({
          ...s,
          error: 'Some selected documents are no longer available.',
        }))
        return
      }

      setState((s) => ({ ...s, isCreating: true, error: null }))

      try {
        // For partial matches, we need to call a different mutation
        // For now, we create individual matches (will be enhanced later)
        for (const candidateId of state.selectedCandidateIds) {
          createManualMatch(suspenseItem.id, candidateId, state.confidence)
        }
        onMatchCreated?.()
      } catch (error) {
        console.error('Failed to create partial match:', error)
        setState((s) => ({
          ...s,
          error: 'Failed to create partial match. Please try again.',
          isCreating: false,
        }))
      }
      return
    }

    // Single match mode (original behavior)
    if (!state.selectedCandidateId) return

    // Validate selected candidate still exists and is pending
    const selectedCandidate = candidates.find((c) => c.id === state.selectedCandidateId)
    if (!selectedCandidate) {
      setState((s) => ({
        ...s,
        error: 'Selected document is no longer available. Please select another.',
        selectedCandidateId: null,
      }))
      return
    }

    setState((s) => ({ ...s, isCreating: true, error: null }))

    try {
      createManualMatch(suspenseItem.id, state.selectedCandidateId, state.confidence)
      onMatchCreated?.()
    } catch (error) {
      console.error('Failed to create manual match:', error)
      setState((s) => ({
        ...s,
        error: 'Failed to create match. Please try again.',
        isCreating: false,
      }))
    }
  }

  const clearSearch = () => {
    setState((s) => ({ ...s, searchQuery: '' }))
    searchInputRef.current?.focus()
  }

  const selectedCandidate = state.partialMatchMode
    ? null // Use selectedCandidates array in partial mode for visual connector
    : candidates.find((c) => c.id === state.selectedCandidateId)

  // Check if we should show the visual connector
  const showVisualConnector = state.partialMatchMode
    ? state.selectedCandidateIds.length > 0
    : state.selectedCandidateId !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
      {/* Screen reader announcement for dynamic content */}
      <div aria-live="polite" className="sr-only">
        {candidates.length} candidates found
        {state.error && `. Error: ${state.error}`}
      </div>

      <div
        ref={modalRef}
        className="w-full max-w-lg bg-background border border-border shadow-xl animate-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-500/10 flex items-center justify-center">
              <IconSearch size={14} className="text-blue-500" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-medium">
                Find Match
              </h2>
              <p id="modal-description" className="text-xs text-muted-foreground">
                Manual reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close modal"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {state.error && (
            <div className="p-3 border border-destructive/30 bg-destructive/5 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <IconWarningCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{state.error}</p>
              </div>
              <button
                onClick={() => setState((s) => ({ ...s, error: null }))}
                className="text-destructive/60 hover:text-destructive transition-colors"
              >
                <IconX size={12} />
              </button>
            </div>
          )}

          {/* Transaction to Match Card */}
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Transaction to Match
            </span>
            <div className="mt-2 p-3 border border-border bg-warning/5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <IconWarningCircle size={16} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <TruncatedText
                      text={suspenseItem.description}
                      maxWidth="200px"
                      className="text-sm font-medium"
                    />
                    <span className="text-sm font-mono font-medium">
                      ${Math.abs(suspenseItem.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {suspenseItem.date}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Connector */}
          {showVisualConnector && (
            <div className="flex items-center justify-center py-1 animate-in fade-in duration-200">
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-3 bg-border" />
                <div className={cn(
                  'w-6 h-6 border flex items-center justify-center',
                  state.partialMatchMode
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-blue-500 bg-blue-500/10'
                )}>
                  <IconArrowDown size={12} className={state.partialMatchMode ? 'text-cyan-500' : 'text-blue-500'} />
                </div>
                <div className="w-px h-3 bg-border" />
              </div>
            </div>
          )}

          {/* Search */}
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Search Candidates
            </span>
            <div className="mt-2 relative group">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by description, invoice #, vendor..."
                value={state.searchQuery}
                onChange={(e) => setState((s) => ({ ...s, searchQuery: e.target.value, error: null }))}
                className="w-full pl-10 pr-10 py-2.5 border border-border bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/40 focus:bg-secondary/30 transition-[border-color,background-color] duration-150"
              />
              {state.searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label="Clear search"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Partial Match Mode Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Partial Match Mode
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                (combine multiple invoices)
              </span>
            </div>
            <button
              onClick={() =>
                setState((s) => ({
                  ...s,
                  partialMatchMode: !s.partialMatchMode,
                  selectedCandidateId: null,
                  selectedCandidateIds: [],
                  error: null,
                }))
              }
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors',
                state.partialMatchMode
                  ? 'bg-cyan-500'
                  : 'bg-secondary border border-border'
              )}
              role="switch"
              aria-checked={state.partialMatchMode}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-background border shadow-sm transition-transform',
                  state.partialMatchMode && 'translate-x-5'
                )}
              />
            </button>
          </div>

          {/* Running Total Display (Partial Match Mode) */}
          {state.partialMatchMode && state.selectedCandidateIds.length > 0 && (
            <div className="p-3 border border-cyan-500/30 bg-cyan-500/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Selected: {state.selectedCandidateIds.length} invoice(s)
                </span>
                <span className="font-mono font-medium">
                  ${partialMatchTotals.selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-muted-foreground">Target:</span>
                <span className="font-mono">
                  ${partialMatchTotals.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Variance:</span>
                <span
                  className={cn(
                    'text-xs font-mono font-medium',
                    partialMatchTotals.isExact
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : partialMatchTotals.isWithinTolerance
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-destructive'
                  )}
                >
                  {partialMatchTotals.isExact ? (
                    'Exact match!'
                  ) : (
                    <>
                      {partialMatchTotals.variance > 0 ? '-' : '+'}$
                      {Math.abs(partialMatchTotals.variance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      {' '}({(partialMatchTotals.variancePercent * 100).toFixed(1)}%)
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Candidates List */}
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Available Matches ({candidates.length})
            </span>
            <div className="mt-2 border border-border max-h-52 overflow-auto">
              {candidates.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No matching candidates found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              ) : (
                candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={
                      state.partialMatchMode
                        ? state.selectedCandidateIds.includes(candidate.id)
                        : state.selectedCandidateId === candidate.id
                    }
                    isMultiSelect={state.partialMatchMode}
                    onClick={() =>
                      state.partialMatchMode
                        ? toggleCandidateSelection(candidate.id)
                        : handleSingleSelect(candidate.id)
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Confidence Selection */}
          {(state.selectedCandidateId || (state.partialMatchMode && state.selectedCandidateIds.length > 0)) && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Match Confidence
              </span>
              <div className="mt-2 flex gap-2">
                {(['high', 'medium', 'low'] as ConfidenceLevel[]).map((level) => {
                  const config = {
                    high: {
                      label: 'High',
                      hint: '≥90% certain',
                      active: 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300',
                      bar: 'bg-emerald-500',
                      barScale: 'scale-x-100',
                    },
                    medium: {
                      label: 'Medium',
                      hint: '70-89% certain',
                      active: 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300',
                      bar: 'bg-amber-500',
                      barScale: 'scale-x-[0.66]',
                    },
                    low: {
                      label: 'Low',
                      hint: '<70% certain',
                      active: 'bg-muted border-muted-foreground/30 text-muted-foreground',
                      bar: 'bg-muted-foreground/40',
                      barScale: 'scale-x-[0.33]',
                    },
                  }[level]

                  const isActive = state.confidence === level

                  return (
                    <button
                      key={level}
                      onClick={() => setState((s) => ({ ...s, confidence: level }))}
                      className={cn(
                        'flex-1 py-3 px-2 border transition-colors duration-150 group',
                        isActive
                          ? config.active
                          : 'border-border text-muted-foreground hover:border-foreground/30'
                      )}
                    >
                      <div className="text-xs font-medium uppercase tracking-wider">
                        {config.label}
                      </div>
                      <div className="mt-2 h-1 bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            'h-full w-full origin-left transition-transform duration-300',
                            config.bar,
                            isActive ? config.barScale : 'scale-x-0'
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          'mt-1.5 text-[10px] transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                        )}
                      >
                        {config.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <ButtonSecondary size="sm" onClick={onClose}>
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            size="sm"
            onClick={handleCreateMatch}
            disabled={
              state.partialMatchMode
                ? state.selectedCandidateIds.length < 2 || state.isCreating
                : !state.selectedCandidateId || state.isCreating
            }
            loading={state.isCreating}
            className={state.partialMatchMode ? 'bg-cyan-500 hover:bg-cyan-600' : ''}
          >
            {state.partialMatchMode
              ? `Create Partial Match (${state.selectedCandidateIds.length})`
              : 'Create Match'}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// CANDIDATE ROW COMPONENT
// =============================================================================

interface CandidateRowProps {
  candidate: AccrualDocument & {
    amountDiff: number
    percentDiff: number
    isWithinTolerance: boolean
    isExactMatch: boolean
  }
  isSelected: boolean
  isMultiSelect?: boolean
  onClick: () => void
}

function CandidateRow({ candidate, isSelected, isMultiSelect = false, onClick }: CandidateRowProps) {
  // Doc type abbreviations and colors
  const docTypeConfig: Record<string, { abbr: string; className: string }> = {
    sales_invoice: { abbr: 'SI', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    purchase_invoice: { abbr: 'PI', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    receipt: { abbr: 'RC', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    pos_report: { abbr: 'POS', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    settlement: { abbr: 'ST', className: 'bg-secondary text-muted-foreground' },
  }

  const typeConfig = docTypeConfig[candidate.docType] || {
    abbr: '??',
    className: 'bg-secondary text-muted-foreground',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-3 text-left border-b border-border last:border-b-0 transition-colors duration-150',
        'hover:bg-secondary/50',
        isSelected && (isMultiSelect
          ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500'
          : 'bg-blue-500/5 border-l-2 border-l-blue-500')
      )}
    >
      <div className="flex items-center gap-3">
        {/* Selection indicator with checkmark */}
        <div
          className={cn(
            'w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-colors',
            isSelected
              ? isMultiSelect
                ? 'border-cyan-500 bg-cyan-500'
                : 'border-blue-500 bg-blue-500'
              : 'border-muted-foreground/30 hover:border-muted-foreground/50'
          )}
        >
          {isSelected && (
            <svg
              className="w-2.5 h-2.5 text-background"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M2 6L5 9L10 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          )}
        </div>

        {/* Doc type indicator with color coding */}
        <div
          className={cn(
            'w-7 h-7 flex items-center justify-center flex-shrink-0 text-[10px] font-medium uppercase',
            typeConfig.className
          )}
        >
          {typeConfig.abbr}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {candidate.docNumber && (
              <span className="text-xs font-mono text-foreground/70 bg-secondary px-1.5 py-0.5">
                {candidate.docNumber}
              </span>
            )}
            <TruncatedText
              text={candidate.counterparty || candidate.description || 'Unknown'}
              maxWidth="120px"
              className="text-sm font-medium"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{candidate.docDate}</div>
        </div>

        {/* Amount with diff indicator */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-mono font-medium">
            ${Math.abs(candidate.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          {candidate.isExactMatch ? (
            <div className="text-xs font-mono mt-0.5 text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500" />
              Exact
            </div>
          ) : (
            <div
              className={cn(
                'text-xs font-mono mt-0.5 flex items-center justify-end gap-1',
                candidate.isWithinTolerance
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5',
                  candidate.isWithinTolerance ? 'bg-amber-500' : 'bg-muted-foreground/30'
                )}
              />
              {candidate.percentDiff < 0.01
                ? '<1%'
                : `${Math.round(candidate.percentDiff * 100)}%`}{' '}
              diff
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
