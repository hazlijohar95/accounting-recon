'use client'

import { cn } from '@/lib/utils'

interface DetectedCompany {
  name: string
  registrationNumber?: string
  bankName?: string
  accountNumber?: string
  matchStatus: 'match' | 'partial_match' | 'mismatch' | 'unknown'
  matchDetails?: string
}

interface CompanyVerificationCardProps {
  detectedCompany: DetectedCompany | undefined
  currentCompanyName: string
  /** When true, analysis has completed but company detection produced no results */
  analysisComplete?: boolean
}

const statusConfig = {
  match: {
    bg: 'bg-emerald-500/5 border-emerald-500/20',
    icon: '✓',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    label: 'Company verified',
  },
  partial_match: {
    bg: 'bg-amber-500/5 border-amber-500/20',
    icon: '!',
    iconBg: 'bg-amber-500/10 text-amber-600',
    label: 'Partial match',
  },
  mismatch: {
    bg: 'bg-red-500/5 border-red-500/20',
    icon: '✕',
    iconBg: 'bg-red-500/10 text-red-600',
    label: 'Company mismatch',
  },
  unknown: {
    bg: 'bg-secondary/30 border-border',
    icon: '?',
    iconBg: 'bg-secondary text-muted-foreground',
    label: 'Could not verify',
  },
}

export function CompanyVerificationCard({
  detectedCompany,
  currentCompanyName,
  analysisComplete,
}: CompanyVerificationCardProps) {
  if (!detectedCompany) {
    // Analysis finished but produced no company info vs still running
    if (analysisComplete) {
      return (
        <div className="border border-border bg-secondary/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-secondary text-muted-foreground text-xs font-medium">
              —
            </span>
            <div>
              <span>Company verification unavailable</span>
              <p className="text-xs mt-0.5 text-muted-foreground/70">
                AI analysis could not extract company information. You can still proceed — documents are classified by type below.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="border border-border bg-secondary/20 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-secondary text-muted-foreground text-xs font-medium">
            ?
          </span>
          Company verification pending...
        </div>
      </div>
    )
  }

  const config = statusConfig[detectedCompany.matchStatus]

  return (
    <div className={cn('border px-4 py-3 space-y-2', config.bg)}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center justify-center w-5 h-5 text-xs font-bold',
              config.iconBg,
            )}
          >
            {config.icon}
          </span>
          <span className="text-sm font-medium">{config.label}</span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs pl-7">
        <div>
          <span className="text-muted-foreground">Current company: </span>
          <span className="font-medium">{currentCompanyName}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Detected: </span>
          <span className="font-medium">{detectedCompany.name}</span>
        </div>
        {detectedCompany.bankName && (
          <div>
            <span className="text-muted-foreground">Bank: </span>
            <span>{detectedCompany.bankName}</span>
          </div>
        )}
        {detectedCompany.accountNumber && (
          <div>
            <span className="text-muted-foreground">Account: </span>
            <span>{detectedCompany.accountNumber}</span>
          </div>
        )}
      </div>

      {/* Warning for mismatch */}
      {detectedCompany.matchStatus === 'mismatch' && (
        <p className="text-xs text-amber-600 pl-7">
          These documents appear to belong to &quot;{detectedCompany.name}&quot;.
          You can still proceed if this is intentional.
        </p>
      )}

      {detectedCompany.matchDetails && detectedCompany.matchStatus !== 'match' && (
        <p className="text-xs text-muted-foreground pl-7">
          {detectedCompany.matchDetails}
        </p>
      )}
    </div>
  )
}
