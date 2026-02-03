'use client'

/**
 * Add Column Popover
 *
 * A multi-step wizard for adding columns to a worksheet:
 * - Step 1: Select type (text, number, AI formula) + enter name
 * - Step 2 (AI formula only): Enter prompt + select input column
 *
 * @module components/workspace/add-column-popover
 */

import { useState, useRef, useEffect } from 'react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import {
  IconText,
  IconHash,
  IconSparkle,
  IconChevronRight,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { PremiumButton } from '@/components/brand'
import { CustomSelect } from '@/components/brand/custom-select'

type WorksheetColumn = Doc<'worksheetColumns'>

interface AddColumnPopoverProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (
    type: 'text' | 'number' | 'formula',
    name: string,
    formula?: string,
    inputColumnId?: Id<'worksheetColumns'>
  ) => void
  existingColumns: WorksheetColumn[]
}

/**
 * Column type icon display
 */
function ColumnTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'number':
      return <IconHash size={12} className="text-muted-foreground" />
    case 'formula':
      return <IconSparkle size={12} className="text-chart-5" />
    default:
      return <IconText size={12} className="text-muted-foreground" />
  }
}

// Export for use in worksheet-grid header
export { ColumnTypeIcon }

/**
 * Add column popover - Redesigned for 2-step max flow
 */
export function AddColumnPopover({
  isOpen,
  onClose,
  onAdd,
  existingColumns,
}: AddColumnPopoverProps) {
  const [step, setStep] = useState<'type-name' | 'formula-input'>('type-name')
  const [selectedType, setSelectedType] = useState<'text' | 'number' | 'formula' | null>(null)
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const [selectedInputColumnId, setSelectedInputColumnId] = useState<string>('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const formulaInputRef = useRef<HTMLInputElement>(null)

  // Filter to only show non-formula columns as input options
  const inputColumnOptions = existingColumns.filter(c => c.columnType !== 'formula')

  useEffect(() => {
    if (isOpen) {
      setStep('type-name')
      setSelectedType(null)
      setName('')
      setFormula('')
      setSelectedInputColumnId('')
    }
  }, [isOpen])

  // Focus name input when type is selected
  useEffect(() => {
    if (selectedType && step === 'type-name') {
      nameInputRef.current?.focus()
    }
  }, [selectedType, step])

  // Focus formula input when entering step 2
  useEffect(() => {
    if (step === 'formula-input') {
      formulaInputRef.current?.focus()
    }
  }, [step])

  if (!isOpen) return null

  const handleTypeSelect = (type: 'text' | 'number' | 'formula') => {
    setSelectedType(type)
  }

  const handleStep1Submit = () => {
    if (!name.trim() || !selectedType) return
    if (selectedType === 'formula') {
      setStep('formula-input')
    } else {
      onAdd(selectedType, name.trim())
      onClose()
    }
  }

  const handleStep2Submit = () => {
    if (!formula.trim()) return
    onAdd(
      'formula',
      name.trim(),
      formula.trim(),
      selectedInputColumnId ? selectedInputColumnId as Id<'worksheetColumns'> : undefined
    )
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg z-20 min-w-[280px] animate-in fade-in slide-in-from-top-1 duration-150">
      {step === 'type-name' && (
        <div className="p-3 space-y-3">
          {/* Step indicator */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-medium">New Column</span>
            {selectedType === 'formula' && (
              <span className="text-muted-foreground/60">Step 1 of 2</span>
            )}
          </div>

          {/* Type selection - compact cards */}
          <div className="flex gap-1.5">
            <button
              onClick={() => handleTypeSelect('text')}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 p-2.5 border transition-all',
                selectedType === 'text'
                  ? 'border-foreground bg-secondary'
                  : 'border-border hover:border-foreground/50'
              )}
            >
              <IconText size={16} className={selectedType === 'text' ? 'text-foreground' : 'text-muted-foreground'} />
              <span className="text-[10px] font-medium">Text</span>
            </button>
            <button
              onClick={() => handleTypeSelect('number')}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 p-2.5 border transition-all',
                selectedType === 'number'
                  ? 'border-foreground bg-secondary'
                  : 'border-border hover:border-foreground/50'
              )}
            >
              <IconHash size={16} className={selectedType === 'number' ? 'text-foreground' : 'text-muted-foreground'} />
              <span className="text-[10px] font-medium">Number</span>
            </button>
            <button
              onClick={() => handleTypeSelect('formula')}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 p-2.5 border transition-all',
                selectedType === 'formula'
                  ? 'border-chart-5 bg-chart-5/10'
                  : 'border-border hover:border-chart-5/50'
              )}
            >
              <IconSparkle size={16} className={selectedType === 'formula' ? 'text-chart-5' : 'text-muted-foreground'} />
              <span className="text-[10px] font-medium">AI</span>
            </button>
          </div>

          {/* Name input - appears after type selection */}
          {selectedType && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  selectedType === 'formula'
                    ? 'e.g., Company CEO'
                    : selectedType === 'number'
                      ? 'e.g., Revenue'
                      : 'e.g., Company Name'
                }
                className="w-full px-2.5 py-2 text-sm border border-border bg-background focus:outline-none focus:border-foreground transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStep1Submit()
                  if (e.key === 'Escape') onClose()
                }}
              />
              <PremiumButton
                size="sm"
                onClick={handleStep1Submit}
                disabled={!name.trim()}
                className="w-full"
              >
                {selectedType === 'formula' ? (
                  <span className="flex items-center gap-1.5">
                    Next
                    <IconChevronRight size={12} />
                  </span>
                ) : (
                  'Add Column'
                )}
              </PremiumButton>
            </div>
          )}
        </div>
      )}

      {step === 'formula-input' && (
        <div className="p-3 space-y-3">
          {/* Step indicator with back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('type-name')}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
            >
              ← Back
            </button>
            <span className="text-[10px] text-muted-foreground/60">Step 2 of 2</span>
          </div>

          {/* Column name display */}
          <div className="flex items-center gap-2 px-2 py-1.5 bg-chart-5/5 border border-chart-5/20">
            <IconSparkle size={12} className="text-chart-5" />
            <span className="text-xs font-medium">{name}</span>
          </div>

          {/* Formula input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium">AI Prompt</label>
            <input
              ref={formulaInputRef}
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder='e.g., "Find the CEO name and title"'
              className="w-full px-2.5 py-2 text-sm border border-border bg-background focus:outline-none focus:border-foreground transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStep2Submit()
                if (e.key === 'Escape') onClose()
              }}
            />
          </div>

          {/* Input column selection (inline) */}
          {inputColumnOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-medium">Input From</label>
              <CustomSelect
                value={selectedInputColumnId}
                onChange={setSelectedInputColumnId}
                options={inputColumnOptions.map(col => ({ value: col._id, label: col.name }))}
                placeholder="First column (auto)"
              />
            </div>
          )}

          <PremiumButton
            size="sm"
            onClick={handleStep2Submit}
            disabled={!formula.trim()}
            className="w-full"
          >
            Add AI Column
          </PremiumButton>
        </div>
      )}
    </div>
  )
}
