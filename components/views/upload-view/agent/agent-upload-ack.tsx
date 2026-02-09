'use client'

/**
 * Agent Upload Acknowledgment
 *
 * Shown in the "upload" step after files are dropped but before processing.
 * Pre-classifies files by filename heuristics (no LLM) and groups them
 * into Cash Basis / Accrual Basis / Other.
 *
 * @module components/views/upload-view/agent/agent-upload-ack
 */

import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  IconBank,
  IconInvoice,
  IconReceipt,
  IconFileText,
} from '@/components/brand/icons'
import type { UploadedFile } from '@/hooks/useFileUploadState'

// ============================================================================
// Types
// ============================================================================

interface AgentUploadAckProps {
  files: UploadedFile[]
}

interface FileGroup {
  label: string
  basisLabel: string
  icon: typeof IconBank
  files: UploadedFile[]
}

// ============================================================================
// Filename heuristics for pre-classification (no LLM)
// ============================================================================

const BANK_PATTERNS = /bank|statement|stmt|account.*statement|transaction.*history/i
const INVOICE_PATTERNS = /invoice|inv|billing|bill|purchase.*order|po[-_ ]?\d/i
const RECEIPT_PATTERNS = /receipt|rcpt|payment.*proof|proof.*payment|voucher/i

function classifyByFilename(fileName: string): 'bank_statement' | 'invoice' | 'receipt' | 'other' {
  const name = fileName.toLowerCase()
  if (BANK_PATTERNS.test(name)) return 'bank_statement'
  if (INVOICE_PATTERNS.test(name)) return 'invoice'
  if (RECEIPT_PATTERNS.test(name)) return 'receipt'
  return 'other'
}

// ============================================================================
// Component
// ============================================================================

export function AgentUploadAck({ files }: AgentUploadAckProps) {
  const groups = useMemo<FileGroup[]>(() => {
    const bankFiles: UploadedFile[] = []
    const invoiceFiles: UploadedFile[] = []
    const receiptFiles: UploadedFile[] = []
    const otherFiles: UploadedFile[] = []

    for (const file of files) {
      const classification = classifyByFilename(file.name)
      switch (classification) {
        case 'bank_statement': bankFiles.push(file); break
        case 'invoice': invoiceFiles.push(file); break
        case 'receipt': receiptFiles.push(file); break
        default: otherFiles.push(file); break
      }
    }

    const result: FileGroup[] = []
    if (bankFiles.length > 0) {
      result.push({
        label: `${bankFiles.length} bank statement${bankFiles.length !== 1 ? 's' : ''}`,
        basisLabel: 'Cash Basis',
        icon: IconBank,
        files: bankFiles,
      })
    }
    if (invoiceFiles.length > 0) {
      result.push({
        label: `${invoiceFiles.length} invoice${invoiceFiles.length !== 1 ? 's' : ''}`,
        basisLabel: 'Accrual Basis',
        icon: IconInvoice,
        files: invoiceFiles,
      })
    }
    if (receiptFiles.length > 0) {
      result.push({
        label: `${receiptFiles.length} receipt${receiptFiles.length !== 1 ? 's' : ''}`,
        basisLabel: 'Accrual Basis',
        icon: IconReceipt,
        files: receiptFiles,
      })
    }
    if (otherFiles.length > 0) {
      result.push({
        label: `${otherFiles.length} other document${otherFiles.length !== 1 ? 's' : ''}`,
        basisLabel: 'To classify',
        icon: IconFileText,
        files: otherFiles,
      })
    }

    return result
  }, [files])

  if (files.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        I see {files.length} file{files.length !== 1 ? 's' : ''}. Here&apos;s what I think they are:
      </p>

      <div className="space-y-1">
        {groups.map((group) => {
          const GroupIcon = group.icon
          return (
            <div
              key={group.label}
              className="flex items-center gap-2 px-2 py-1.5 border border-border bg-background"
            >
              <GroupIcon size={14} className="shrink-0 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1">{group.label}</span>
              <span className="text-xs text-muted-foreground">{group.basisLabel}</span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        I&apos;ll confirm the exact types once I process them.
      </p>
    </div>
  )
}
