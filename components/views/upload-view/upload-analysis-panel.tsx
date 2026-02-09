'use client'

import { cn } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { CompanyVerificationCard } from './company-verification-card'
import { DocumentRow } from './document-row'
import type { AnalysisPhase } from '@/hooks/useUploadAnalysis'

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

interface AnalysisStats {
  totalDocuments: number
  totalPages: number
  cashDocuments: number
  accrualDocuments: number
  cashTransactions: number
  accrualItems: number
  failedDocuments: number
}

interface DetectedCompany {
  name: string
  registrationNumber?: string
  bankName?: string
  accountNumber?: string
  matchStatus: 'match' | 'partial_match' | 'mismatch' | 'unknown'
  matchDetails?: string
}

interface UploadAnalysisPanelProps {
  phase: AnalysisPhase
  detectedCompany?: DetectedCompany
  documentClassifications: DocumentClassification[]
  stats?: AnalysisStats
  currentCompanyName: string
  extractionProgress?: { completed: number; total: number; failed: number } | null
  onReclassify: (
    docId: Id<"documents">,
    classification: string,
    basisType: 'cash' | 'accrual',
  ) => void
  onProceed: () => void
  onDismiss: () => void
  isApproving: boolean
}

export function UploadAnalysisPanel({
  phase,
  detectedCompany,
  documentClassifications,
  stats,
  currentCompanyName,
  extractionProgress,
  onReclassify,
  onProceed,
  onDismiss,
  isApproving,
}: UploadAnalysisPanelProps) {
  // Split documents by effective basis type
  const cashDocs = documentClassifications.filter((d) => {
    const basis = d.userOverride?.basisType ?? d.basisType
    return basis === 'cash'
  })
  const accrualDocs = documentClassifications.filter((d) => {
    const basis = d.userOverride?.basisType ?? d.basisType
    return basis === 'accrual'
  })

  return (
    <div className="space-y-4 animate-fade-in" style={{ animationDuration: '300ms' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Upload Analysis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phase === 'waiting' && 'Waiting for extractions to complete...'}
            {phase === 'analyzing' && 'AI is classifying your documents...'}
            {phase === 'ready' && 'Review document classifications before proceeding'}
            {phase === 'approved' && 'Analysis approved, creating session...'}
          </p>
        </div>

        {/* Extraction progress indicator */}
        {phase === 'waiting' && extractionProgress && (
          <div className="text-xs text-muted-foreground">
            <span className="font-mono">
              {extractionProgress.completed}/{extractionProgress.total}
            </span>{' '}
            extracted
            {extractionProgress.failed > 0 && (
              <span className="text-red-500 ml-1">({extractionProgress.failed} failed)</span>
            )}
          </div>
        )}
      </div>

      {/* Loading state */}
      {(phase === 'waiting' || phase === 'analyzing') && (
        <div className="border border-border bg-secondary/10 px-6 py-8 flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground animate-spin" />
          <p className="text-xs text-muted-foreground">
            {phase === 'waiting'
              ? `Extracting data from ${extractionProgress?.total ?? '...'} documents...`
              : 'Analyzing document types and verifying company...'}
          </p>
          {phase === 'waiting' && extractionProgress && extractionProgress.total > 0 && (
            <div className="w-48 h-1 bg-secondary overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${Math.round((extractionProgress.completed / extractionProgress.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Ready state - full analysis results */}
      {(phase === 'ready' || phase === 'approved') && (
        <>
          {/* Company Verification */}
          <CompanyVerificationCard
            detectedCompany={detectedCompany}
            currentCompanyName={currentCompanyName}
            analysisComplete={phase === 'ready' || phase === 'approved'}
          />

          {/* Document Breakdown */}
          <div className="border border-border">
            {/* Cash Basis Section */}
            <div>
              <div className="px-4 py-2 bg-blue-500/5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500" />
                  <span className="text-xs font-medium">Cash Basis</span>
                  <span className="text-xs text-muted-foreground">
                    {cashDocs.length} {cashDocs.length === 1 ? 'document' : 'documents'}
                  </span>
                </div>
                {stats && (
                  <span className="text-xs text-muted-foreground">
                    {stats.cashTransactions} transactions
                  </span>
                )}
              </div>
              {cashDocs.length > 0 ? (
                <div>
                  {cashDocs.map((doc) => (
                    <DocumentRow
                      key={doc.documentId}
                      doc={doc}
                      onReclassify={onReclassify}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                  No cash basis documents. You can add bank statements later.
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Accrual Basis Section */}
            <div>
              <div className="px-4 py-2 bg-purple-500/5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500" />
                  <span className="text-xs font-medium">Accrual Basis</span>
                  <span className="text-xs text-muted-foreground">
                    {accrualDocs.length} {accrualDocs.length === 1 ? 'document' : 'documents'}
                  </span>
                </div>
                {stats && (
                  <span className="text-xs text-muted-foreground">
                    {stats.accrualItems} items
                  </span>
                )}
              </div>
              {accrualDocs.length > 0 ? (
                <div>
                  {accrualDocs.map((doc) => (
                    <DocumentRow
                      key={doc.documentId}
                      doc={doc}
                      onReclassify={onReclassify}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                  No accrual documents. You can add invoices/receipts later.
                </div>
              )}
            </div>
          </div>

          {/* Aggregate Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Documents" value={stats.totalDocuments} />
              <StatCard label="Pages" value={stats.totalPages} />
              <StatCard
                label="Cash Txn"
                value={stats.cashTransactions}
                accent="blue"
              />
              <StatCard
                label="Accrual Items"
                value={stats.accrualItems}
                accent="purple"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onDismiss}
              disabled={isApproving}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 disabled:opacity-50"
            >
              Skip Analysis
            </button>
            <button
              onClick={onProceed}
              disabled={isApproving || phase === 'approved'}
              className={cn(
                'px-6 py-2.5 text-sm font-medium transition-colors',
                'bg-foreground text-background',
                'hover:bg-foreground/90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isApproving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-background/40 border-t-background animate-spin" />
                  Creating session...
                </span>
              ) : (
                'Start Reconciliation'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'blue' | 'purple'
}) {
  return (
    <div className="border border-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-medium tabular-nums mt-0.5',
          accent === 'blue' && 'text-blue-600',
          accent === 'purple' && 'text-purple-600',
        )}
      >
        {value}
      </p>
    </div>
  )
}
