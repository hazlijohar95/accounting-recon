/**
 * File utility functions
 * Centralized utilities for file operations, filtering, and validation
 */

import { FILE_STATUS, type FileStatus, type DocumentType } from './constants/upload'

/**
 * Uploaded file type definition
 */
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: DocumentType
  status: FileStatus
  progress: number
  progressMessage?: string
  documentId?: string
  errorMessage?: string
  file?: File
}

/**
 * File status filter predicates
 */
export const fileStatusFilters = {
  idle: (f: UploadedFile) => f.status === FILE_STATUS.IDLE,
  uploading: (f: UploadedFile) => f.status === FILE_STATUS.UPLOADING,
  processing: (f: UploadedFile) => f.status === FILE_STATUS.PROCESSING,
  complete: (f: UploadedFile) => f.status === FILE_STATUS.COMPLETE,
  failed: (f: UploadedFile) => f.status === FILE_STATUS.FAILED,
  /** Files currently being uploaded or processed */
  active: (f: UploadedFile) =>
    f.status === FILE_STATUS.UPLOADING || f.status === FILE_STATUS.PROCESSING,
  /** Files that haven't been completed (idle, uploading, processing, failed) */
  pending: (f: UploadedFile) => f.status !== FILE_STATUS.COMPLETE,
  /** Files that can be retried (idle or failed) */
  retriable: (f: UploadedFile) =>
    f.status === FILE_STATUS.IDLE || f.status === FILE_STATUS.FAILED,
} as const

/**
 * File statistics from a list of files
 */
export interface FileStats {
  total: number
  idle: number
  uploading: number
  processing: number
  complete: number
  failed: number
  active: number
  pending: number
}

/**
 * Calculate file statistics from a list of files
 */
export function getFileStats(files: UploadedFile[]): FileStats {
  return {
    total: files.length,
    idle: files.filter(fileStatusFilters.idle).length,
    uploading: files.filter(fileStatusFilters.uploading).length,
    processing: files.filter(fileStatusFilters.processing).length,
    complete: files.filter(fileStatusFilters.complete).length,
    failed: files.filter(fileStatusFilters.failed).length,
    active: files.filter(fileStatusFilters.active).length,
    pending: files.filter(fileStatusFilters.pending).length,
  }
}

/**
 * Calculate batch progress percentage
 * Complete files count as 100%, active files count as 50%
 */
export function getBatchProgress(files: UploadedFile[]): number {
  const total = files.length
  if (total === 0) return 0

  const completed = files.filter(fileStatusFilters.complete).length
  const active = files.filter(fileStatusFilters.active).length

  return Math.round(((completed + active * 0.5) / total) * 100)
}

/**
 * Detect document type from filename.
 * Uses separator-aware matching to prevent false positives like "investment" matching "inv".
 * Separators are: underscore, hyphen, dot, space, or string boundaries.
 */
export function detectDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase()
  // Separator-aware pattern: word must be preceded/followed by a separator or string boundary
  // \b doesn't work because JS treats _ as a word character
  const sep = '(?:^|[\\s_\\-.])'  // start of string or separator
  const sepEnd = '(?:$|[\\s_\\-.])'  // end of string or separator

  if (new RegExp(`${sep}statement${sepEnd}`).test(lower) || new RegExp(`${sep}bank${sepEnd}`).test(lower)) {
    return 'bank_statement'
  }
  if (new RegExp(`${sep}invoice${sepEnd}`).test(lower) || new RegExp(`${sep}inv${sepEnd}`).test(lower)) {
    return 'invoice'
  }
  if (new RegExp(`${sep}receipt${sepEnd}`).test(lower) || new RegExp(`${sep}rcpt${sepEnd}`).test(lower)) {
    return 'receipt'
  }
  return 'other'
}

/**
 * Sanitize filename to prevent path traversal and injection attacks
 * - Removes directory separators (/, \, ..)
 * - Removes null bytes and control characters
 * - Limits length to 255 characters
 * - Preserves file extension
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and parent directory references
  let sanitized = filename
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    // Remove null bytes and control characters (ASCII 0-31)
    .replace(/[\x00-\x1f]/g, '')
    // Remove other potentially dangerous characters
    .replace(/[<>:"|?*]/g, '_')
    .trim()

  // Limit filename length (preserve extension if possible)
  if (sanitized.length > 255) {
    const lastDot = sanitized.lastIndexOf('.')
    if (lastDot > 0 && sanitized.length - lastDot <= 10) {
      // Has a reasonable extension (1-10 chars after last dot)
      const ext = sanitized.substring(lastDot)
      const baseName = sanitized.slice(0, 255 - ext.length)
      sanitized = `${baseName}${ext}`
    } else {
      // No extension or extension too long - just truncate
      sanitized = sanitized.slice(0, 255)
    }
  }

  // Fallback for empty filenames
  if (!sanitized || sanitized === '.') {
    sanitized = 'unnamed_file'
  }

  return sanitized
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Format currency for display (MYR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format time duration for display
 */
export function formatWaitTime(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null
  if (seconds < 60) return `~${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  return `~${minutes}m`
}

/**
 * Format estimated time remaining
 */
export function formatTimeRemaining(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null
  if (seconds < 60) return `~${seconds}s remaining`
  const minutes = Math.ceil(seconds / 60)
  return `~${minutes} min remaining`
}
