'use client'

/**
 * Field-Level Confidence Display Components
 *
 * Shows per-field confidence scores with color-coded indicators:
 * - Green (≥90%): High confidence - clear, parseable
 * - Amber (70-89%): Medium confidence - likely correct
 * - Red (<70%): Low confidence - AI uncertain
 *
 * @module components/field-confidence
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { IconWarning, IconCheckCircle, IconInfo } from '@/components/brand/icons'
import { SourceLinkButton, type BoundingBox } from './document-viewer'
import { Id } from '@/convex/_generated/dataModel'

// ============================================================================
// Types
// ============================================================================

interface FieldConfidence {
  date?: number
  description?: number
  amount?: number
  reference?: number
}

interface FieldBoundingBoxes {
  pageNumber: number
  date?: BoundingBox
  description?: BoundingBox
  amount?: BoundingBox
  reference?: BoundingBox
}

interface ConfidenceFieldProps {
  /** Field name for display */
  label: string
  /** The extracted value */
  value: string | number
  /** Confidence score 0-100 */
  confidence?: number
  /** Bounding box for source linking */
  boundingBox?: BoundingBox
  /** Document ID for source linking */
  documentId?: Id<"documents">
  /** Page number for source linking */
  pageNumber?: number
  /** Whether to show the source link button */
  showSourceLink?: boolean
  /** Additional class name */
  className?: string
}

interface TransactionFieldsProps {
  /** Transaction data */
  transaction: {
    date: string
    description: string
    amount: number
    reference?: string
  }
  /** Field confidence scores */
  fieldConfidence?: FieldConfidence
  /** Bounding boxes for source linking */
  boundingBoxes?: FieldBoundingBoxes
  /** Document ID for source linking */
  documentId?: Id<"documents">
  /** Whether to show inline confidence */
  showInlineConfidence?: boolean
  /** Whether to show source links */
  showSourceLinks?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// Confidence Utilities
// ============================================================================

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 90) return 'high'
  if (confidence >= 70) return 'medium'
  return 'low'
}

/**
 * Get color classes for confidence level
 */
export function getConfidenceColors(confidence: number | undefined): {
  bg: string
  text: string
  border: string
} {
  if (confidence === undefined) {
    return {
      bg: 'bg-secondary/50',
      text: 'text-muted-foreground',
      border: 'border-border',
    }
  }

  if (confidence >= 90) {
    return {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/30',
    }
  }

  if (confidence >= 70) {
    return {
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/30',
    }
  }

  return {
    bg: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/30',
  }
}

/**
 * Get icon for confidence level
 */
function ConfidenceIcon({ confidence }: { confidence?: number }) {
  if (confidence === undefined) {
    return <IconInfo size={12} className="text-muted-foreground" />
  }

  if (confidence >= 90) {
    return <IconCheckCircle size={12} className="text-success" />
  }

  if (confidence >= 70) {
    return <IconWarning size={12} className="text-warning" />
  }

  return <IconWarning size={12} className="text-error" />
}

// ============================================================================
// Components
// ============================================================================

/**
 * Inline confidence indicator (small badge)
 */
export function ConfidenceIndicator({
  confidence,
  showLabel = false,
  size = 'sm',
}: {
  confidence?: number
  showLabel?: boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  if (confidence === undefined) return null

  const colors = getConfidenceColors(confidence)
  const level = getConfidenceLevel(confidence)

  const sizeClasses = {
    xs: 'text-[10px] px-1 py-0.5',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded',
        colors.bg,
        colors.text,
        sizeClasses[size]
      )}
      title={`${Math.round(confidence)}% confidence (${level})`}
    >
      <ConfidenceIcon confidence={confidence} />
      {showLabel && (
        <span className="capitalize">{level}</span>
      )}
      <span className="tabular-nums">{Math.round(confidence)}%</span>
    </span>
  )
}

/**
 * Single field with confidence display
 */
export function ConfidenceField({
  label,
  value,
  confidence,
  boundingBox,
  documentId,
  pageNumber,
  showSourceLink = true,
  className,
}: ConfidenceFieldProps) {
  const colors = getConfidenceColors(confidence)
  const hasLowConfidence = confidence !== undefined && confidence < 70

  return (
    <div
      className={cn(
        'group relative',
        hasLowConfidence && 'px-2 py-1 rounded border',
        hasLowConfidence && colors.border,
        hasLowConfidence && colors.bg,
        className
      )}
    >
      {/* Field label */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
        <span>{label}</span>
        {confidence !== undefined && (
          <ConfidenceIndicator confidence={confidence} size="xs" />
        )}
      </div>

      {/* Field value */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className={cn(
          'font-medium',
          hasLowConfidence && colors.text
        )}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>

        {/* Source link button */}
        {showSourceLink && boundingBox && documentId && pageNumber && (
          <SourceLinkButton
            documentId={documentId}
            pageNumber={pageNumber}
            fieldName={label}
            value={String(value)}
            boundingBox={boundingBox}
            confidence={confidence}
          />
        )}
      </div>

      {/* Low confidence warning */}
      {hasLowConfidence && (
        <p className="text-[10px] text-muted-foreground mt-1">
          AI uncertain - please verify this value
        </p>
      )}
    </div>
  )
}

/**
 * Transaction fields with confidence display
 * Shows all fields of a transaction with their confidence scores
 */
export function TransactionFields({
  transaction,
  fieldConfidence,
  boundingBoxes,
  documentId,
  showInlineConfidence = true,
  showSourceLinks = true,
  className,
}: TransactionFieldsProps) {
  const pageNumber = boundingBoxes?.pageNumber ?? 1

  // Calculate overall confidence
  const overallConfidence = fieldConfidence
    ? Math.round(
        (
          (fieldConfidence.date ?? 100) +
          (fieldConfidence.description ?? 100) +
          (fieldConfidence.amount ?? 100) +
          (fieldConfidence.reference ?? 100)
        ) / 4
      )
    : undefined

  return (
    <div className={cn('space-y-2', className)}>
      {/* Date */}
      <ConfidenceField
        label="Date"
        value={transaction.date}
        confidence={showInlineConfidence ? fieldConfidence?.date : undefined}
        boundingBox={boundingBoxes?.date}
        documentId={documentId}
        pageNumber={pageNumber}
        showSourceLink={showSourceLinks}
      />

      {/* Description */}
      <ConfidenceField
        label="Description"
        value={transaction.description}
        confidence={showInlineConfidence ? fieldConfidence?.description : undefined}
        boundingBox={boundingBoxes?.description}
        documentId={documentId}
        pageNumber={pageNumber}
        showSourceLink={showSourceLinks}
      />

      {/* Amount */}
      <ConfidenceField
        label="Amount"
        value={transaction.amount}
        confidence={showInlineConfidence ? fieldConfidence?.amount : undefined}
        boundingBox={boundingBoxes?.amount}
        documentId={documentId}
        pageNumber={pageNumber}
        showSourceLink={showSourceLinks}
      />

      {/* Reference (optional) */}
      {transaction.reference && (
        <ConfidenceField
          label="Reference"
          value={transaction.reference}
          confidence={showInlineConfidence ? fieldConfidence?.reference : undefined}
          boundingBox={boundingBoxes?.reference}
          documentId={documentId}
          pageNumber={pageNumber}
          showSourceLink={showSourceLinks}
        />
      )}
    </div>
  )
}

/**
 * Confidence summary bar
 * Shows overall confidence with field breakdown
 */
export function ConfidenceSummary({
  fieldConfidence,
  className,
}: {
  fieldConfidence?: FieldConfidence
  className?: string
}) {
  if (!fieldConfidence) return null

  const fields = [
    { label: 'Date', value: fieldConfidence.date },
    { label: 'Description', value: fieldConfidence.description },
    { label: 'Amount', value: fieldConfidence.amount },
    { label: 'Reference', value: fieldConfidence.reference },
  ].filter((f) => f.value !== undefined)

  if (fields.length === 0) return null

  const avgConfidence = Math.round(
    fields.reduce((sum, f) => sum + (f.value ?? 0), 0) / fields.length
  )

  return (
    <div className={cn('space-y-2', className)}>
      {/* Overall */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Field Confidence</span>
        <ConfidenceIndicator confidence={avgConfidence} showLabel size="sm" />
      </div>

      {/* Per-field breakdown */}
      <div className="grid grid-cols-4 gap-1">
        {fields.map((field) => (
          <div key={field.label} className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase">
              {field.label.slice(0, 4)}
            </div>
            <div
              className={cn(
                'text-xs font-medium tabular-nums',
                getConfidenceColors(field.value).text
              )}
            >
              {field.value}%
            </div>
          </div>
        ))}
      </div>

      {/* Visual bar */}
      <div className="flex h-1 rounded overflow-hidden">
        {fields.map((field) => {
          const colors = getConfidenceColors(field.value)
          return (
            <div
              key={field.label}
              className={cn('flex-1', colors.bg.replace('/10', '/40'))}
              title={`${field.label}: ${field.value}%`}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Confidence legend
 * Explains the color coding
 */
export function ConfidenceLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 text-xs', className)}>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-muted-foreground">High (≥90%)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-warning" />
        <span className="text-muted-foreground">Medium (70-89%)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-error" />
        <span className="text-muted-foreground">Low (&lt;70%)</span>
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export type { FieldConfidence, FieldBoundingBoxes }
