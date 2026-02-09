import { Id } from '@/convex/_generated/dataModel'

export type FileStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'failed'

export type UploadTab = 'upload' | 'documents' | 'analysis'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: 'bank_statement' | 'invoice' | 'receipt' | 'other'
  status: FileStatus
  progress: number
  progressMessage?: string
  documentId?: Id<"documents">
  errorMessage?: string
  file?: File
}

// File type labels mapping (shared across components)
export const fileTypeLabels: Record<UploadedFile['type'], string> = {
  bank_statement: 'Bank Statement',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Document',
}

// Extraction status color styles (shared across components)
export const statusColors: Record<string, string> = {
  pending: 'bg-secondary text-muted-foreground',
  processing: 'bg-info-light text-info',
  completed: 'bg-success-light text-success',
  failed: 'bg-error-light text-error',
}

// Classification options for the reclassify dropdown
export const classificationGroups = [
  { label: 'Cash Basis', options: [
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'cash_book', label: 'Cash Book' },
    { value: 'payment_voucher', label: 'Payment Voucher' },
  ]},
  { label: 'Accrual Basis', options: [
    { value: 'invoice', label: 'Invoice' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'credit_note', label: 'Credit Note' },
    { value: 'pos_report', label: 'POS Report' },
    { value: 'settlement', label: 'Settlement' },
  ]},
]

// All classification options flattened (for lookups)
export const allClassificationOptions = classificationGroups.flatMap((g) => g.options)

// Map classification to basis type
export function classificationToBasis(classification: string): 'cash' | 'accrual' {
  const cashTypes = new Set(['bank_statement', 'cash_book', 'payment_voucher'])
  return cashTypes.has(classification) ? 'cash' : 'accrual'
}

// Document type for the documents section
export type DocumentItem = {
  _id: Id<"documents">
  fileName: string
  fileSize: number
  documentType: string
  extractionStatus: string
  uploadedAt: number
  extractedTransactionCount?: number
  extractionConfidence?: number
  errorMessage?: string
}
