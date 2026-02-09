'use client'

import { cn } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { classificationGroups, allClassificationOptions, classificationToBasis } from './types'

interface DocumentClassification {
  documentId: Id<"documents">
  fileName: string
  aiClassification: string
  basisType: 'cash' | 'accrual'
  confidence: number
  reason?: string
  userOverride?: {
    classification: string
    basisType: 'cash' | 'accrual'
  } | null
  pageCount?: number
  transactionCount?: number
  extractionStatus: string
  errorMessage?: string
}

interface DocumentRowProps {
  doc: DocumentClassification
  onReclassify: (
    docId: Id<"documents">,
    classification: string,
    basisType: 'cash' | 'accrual',
  ) => void
}

function getConfidenceIndicator(confidence: number) {
  if (confidence >= 80) return { label: 'High', className: 'text-emerald-600' }
  if (confidence >= 50) return { label: 'Med', className: 'text-amber-600' }
  return { label: 'Low', className: 'text-red-500' }
}

function getClassificationLabel(classification: string): string {
  return allClassificationOptions.find((o) => o.value === classification)?.label || classification
}

export function DocumentRow({ doc, onReclassify }: DocumentRowProps) {
  const effectiveClassification = doc.userOverride?.classification ?? doc.aiClassification
  const effectiveBasis = doc.userOverride?.basisType ?? doc.basisType
  const isOverridden = !!doc.userOverride
  const isFailed = doc.extractionStatus === 'failed'
  const confidenceIndicator = getConfidenceIndicator(doc.confidence)

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-xs',
        'border-b border-border/50 last:border-b-0',
        isFailed && 'opacity-60',
      )}
    >
      {/* Filename - truncated */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium" title={doc.fileName}>
          {doc.fileName}
        </p>
        {doc.reason && !isOverridden && (
          <p className="text-muted-foreground truncate mt-0.5" title={doc.reason}>
            {doc.reason}
          </p>
        )}
        {isOverridden && (
          <p className="text-amber-600 mt-0.5">
            Reclassified from {getClassificationLabel(doc.aiClassification)}
          </p>
        )}
        {isFailed && doc.errorMessage && (
          <p className="text-red-500 mt-0.5 truncate" title={doc.errorMessage}>
            {doc.errorMessage}
          </p>
        )}
      </div>

      {/* Classification badge */}
      <span
        className={cn(
          'shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
          effectiveBasis === 'cash'
            ? 'bg-blue-500/10 text-blue-600'
            : 'bg-purple-500/10 text-purple-600',
          isOverridden && 'ring-1 ring-amber-400/50',
        )}
      >
        {getClassificationLabel(effectiveClassification)}
      </span>

      {/* Confidence */}
      {!isFailed && (
        <span className={cn('shrink-0 w-8 text-center font-mono', confidenceIndicator.className)}>
          {doc.confidence}%
        </span>
      )}

      {/* Stats */}
      <div className="shrink-0 w-16 text-right text-muted-foreground">
        {isFailed ? (
          <span className="text-red-500">Failed</span>
        ) : (
          <>
            {doc.transactionCount !== undefined && doc.transactionCount > 0 && (
              <span>{doc.transactionCount} txn</span>
            )}
            {doc.pageCount !== undefined && doc.pageCount > 0 && (
              <span className="ml-1">{doc.pageCount}pg</span>
            )}
          </>
        )}
      </div>

      {/* Reclassify dropdown */}
      {!isFailed && (
        <select
          value={effectiveClassification}
          onChange={(e) => {
            const newClassification = e.target.value
            const newBasis = classificationToBasis(newClassification)
            onReclassify(doc.documentId, newClassification, newBasis)
          }}
          className={cn(
            'shrink-0 w-[130px] px-2 py-1 text-xs',
            'bg-background border border-border',
            'focus:outline-none focus:border-foreground',
          )}
        >
          {classificationGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  )
}
