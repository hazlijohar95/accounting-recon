/**
 * Upload-related constants
 * Centralized constants for file upload, status, and error handling
 */

// File status values
export const FILE_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
} as const

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS]

// Document type labels for display
export const FILE_TYPE_LABELS = {
  bank_statement: 'Bank Statement',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Document',
} as const

export type DocumentType = keyof typeof FILE_TYPE_LABELS

// Extraction status color styles
export const STATUS_COLORS = {
  pending: 'bg-secondary text-muted-foreground',
  processing: 'bg-info-light text-info',
  completed: 'bg-success-light text-success',
  failed: 'bg-error-light text-error',
} as const

// Security: File validation constants (must match convex/documents.ts)
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_FILE_SIZE_MB = 50

/** Gemini extraction provider has a lower limit for inline data */
export const GEMINI_MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
export const GEMINI_MAX_FILE_SIZE_MB = 20

/** Maximum files per upload batch to prevent browser overload */
export const MAX_FILES_PER_BATCH = 50

export const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'csv',
  'xls',
  'xlsx',
] as const

// Upload timing constants
export const UPLOAD_CONFIG = {
  /** XHR timeout in milliseconds (5 minutes) */
  XHR_TIMEOUT_MS: 5 * 60 * 1000,
  /** Demo mode progress increment */
  DEMO_PROGRESS_INCREMENT: 10,
  /** Demo mode delay between progress updates (ms) */
  DEMO_PROGRESS_DELAY_MS: 50,
  /** Animation delay for drop zone (ms) */
  ANIMATION_DELAY_MS: 200,
  /** Progress bar animation duration (ms) */
  PROGRESS_ANIMATION_MS: 150,
  /** Batch progress animation duration (ms) */
  BATCH_PROGRESS_ANIMATION_MS: 300,
  /** Queue progress animation duration (ms) */
  QUEUE_PROGRESS_ANIMATION_MS: 500,
} as const

// User-friendly error messages
export const ERROR_MESSAGES = {
  RATE_LIMIT: {
    title: 'Too many uploads',
    description: 'Please wait a moment before uploading more files',
  },
  FILE_TYPE_NOT_ALLOWED: {
    title: 'Invalid file type',
    description: 'Please upload PDF, CSV, Excel, or image files only',
  },
  FILE_TOO_LARGE: {
    title: 'File too large',
    description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB`,
  },
  AUTHENTICATION_EXPIRED: {
    title: 'Session expired',
    description: 'Please refresh the page and try again',
  },
  NO_COMPANY_SELECTED: {
    title: 'Upload failed',
    description: 'Please select a company first',
  },
  EXTRACTION_FAILED: {
    title: 'Extraction failed',
    description: 'Document could not be processed',
  },
  NETWORK_ERROR: {
    title: 'Network error',
    description: 'Upload failed due to network issues',
  },
  UPLOAD_CANCELLED: {
    title: 'Upload cancelled',
    description: 'The upload was cancelled',
  },
  UPLOAD_TIMEOUT: {
    title: 'Upload timed out',
    description: 'Upload timed out after 5 minutes',
  },
} as const

// Bank type display names
export const BANK_TYPE_LABELS: Record<string, string> = {
  maybank: 'Maybank',
  cimb: 'CIMB',
  public_bank: 'Public Bank',
  rhb: 'RHB',
  hong_leong: 'Hong Leong',
  ambank: 'AmBank',
  bank_islam: 'Bank Islam',
  ocbc: 'OCBC',
  uob: 'UOB',
  hsbc: 'HSBC',
  unknown: 'Unknown',
}

/**
 * Map raw error message to user-friendly error
 */
export function mapErrorMessage(rawMessage: string): { title: string; description: string } {
  if (rawMessage.includes('Rate limit exceeded')) {
    return ERROR_MESSAGES.RATE_LIMIT
  }
  if (rawMessage.includes('File type not allowed')) {
    return ERROR_MESSAGES.FILE_TYPE_NOT_ALLOWED
  }
  if (rawMessage.includes('File too large')) {
    return ERROR_MESSAGES.FILE_TOO_LARGE
  }
  if (rawMessage.includes('Authentication') || rawMessage.includes('Unauthorized')) {
    return ERROR_MESSAGES.AUTHENTICATION_EXPIRED
  }
  if (rawMessage.includes('Network error')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  if (rawMessage.includes('cancelled') || rawMessage.includes('canceled')) {
    return ERROR_MESSAGES.UPLOAD_CANCELLED
  }
  if (rawMessage.includes('timed out') || rawMessage.includes('timeout')) {
    return ERROR_MESSAGES.UPLOAD_TIMEOUT
  }

  // Default: return the raw message
  return {
    title: 'Upload failed',
    description: rawMessage,
  }
}
