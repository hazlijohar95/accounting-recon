import { describe, expect, it } from 'vitest'
import {
  detectDocumentType,
  fileStatusFilters,
  formatCurrency,
  formatTimeRemaining,
  formatWaitTime,
  getBatchProgress,
  getFileExtension,
  getFileStats,
  sanitizeFilename,
  type UploadedFile,
} from '@/lib/fileUtils'
import { FILE_STATUS } from '@/lib/constants/upload'

const baseFile: UploadedFile = {
  id: 'file-1',
  name: 'example.pdf',
  size: 100,
  type: 'other',
  status: FILE_STATUS.IDLE,
  progress: 0,
}

describe('fileUtils', () => {
  it('filters by file status correctly', () => {
    const files: UploadedFile[] = [
      { ...baseFile, id: 'idle', status: FILE_STATUS.IDLE },
      { ...baseFile, id: 'uploading', status: FILE_STATUS.UPLOADING },
      { ...baseFile, id: 'processing', status: FILE_STATUS.PROCESSING },
      { ...baseFile, id: 'complete', status: FILE_STATUS.COMPLETE },
      { ...baseFile, id: 'failed', status: FILE_STATUS.FAILED },
    ]

    expect(files.filter(fileStatusFilters.idle)).toHaveLength(1)
    expect(files.filter(fileStatusFilters.uploading)).toHaveLength(1)
    expect(files.filter(fileStatusFilters.processing)).toHaveLength(1)
    expect(files.filter(fileStatusFilters.complete)).toHaveLength(1)
    expect(files.filter(fileStatusFilters.failed)).toHaveLength(1)
    expect(files.filter(fileStatusFilters.active)).toHaveLength(2)
    expect(files.filter(fileStatusFilters.pending)).toHaveLength(4)
    expect(files.filter(fileStatusFilters.retriable)).toHaveLength(2)
  })

  it('calculates file stats and batch progress', () => {
    const files: UploadedFile[] = [
      { ...baseFile, id: 'complete-1', status: FILE_STATUS.COMPLETE },
      { ...baseFile, id: 'complete-2', status: FILE_STATUS.COMPLETE },
      { ...baseFile, id: 'uploading', status: FILE_STATUS.UPLOADING },
      { ...baseFile, id: 'processing', status: FILE_STATUS.PROCESSING },
      { ...baseFile, id: 'idle', status: FILE_STATUS.IDLE },
    ]

    const stats = getFileStats(files)
    expect(stats.total).toBe(5)
    expect(stats.complete).toBe(2)
    expect(stats.uploading).toBe(1)
    expect(stats.processing).toBe(1)
    expect(stats.idle).toBe(1)
    expect(stats.active).toBe(2)
    expect(stats.pending).toBe(3)

    expect(getBatchProgress(files)).toBe(60)
    expect(getBatchProgress([])).toBe(0)
  })

  it('detects document types by filename', () => {
    expect(detectDocumentType('bank_statement_jan.pdf')).toBe('bank_statement')
    expect(detectDocumentType('Invoice_1234.PDF')).toBe('invoice')
    expect(detectDocumentType('rcpt_2024.png')).toBe('receipt')
    expect(detectDocumentType('misc-doc.txt')).toBe('other')
  })

  it('sanitizes filenames safely', () => {
    expect(sanitizeFilename(' ../foo\\bar?.pdf ')).toBe('__foo_bar_.pdf')
    expect(sanitizeFilename('..')).toBe('_')
    expect(sanitizeFilename('.')).toBe('unnamed_file')

    const longName = `${'a'.repeat(260)}.pdf`
    const sanitizedLong = sanitizeFilename(longName)
    expect(sanitizedLong.length).toBeLessThanOrEqual(255)
    expect(sanitizedLong.endsWith('.pdf')).toBe(true)
  })

  it('returns file extensions and formatted display strings', () => {
    expect(getFileExtension('archive.TAR.GZ')).toBe('gz')
    expect(getFileExtension('noext')).toBe('noext')

    const currency = formatCurrency(1234)
    expect(currency).toContain('RM')
    expect(currency).toContain('1,234.00')

    expect(formatWaitTime(null)).toBeNull()
    expect(formatWaitTime(0)).toBeNull()
    expect(formatWaitTime(45)).toBe('~45s')
    expect(formatWaitTime(61)).toBe('~2m')

    expect(formatTimeRemaining(null)).toBeNull()
    expect(formatTimeRemaining(0)).toBeNull()
    expect(formatTimeRemaining(45)).toBe('~45s remaining')
    expect(formatTimeRemaining(61)).toBe('~2 min remaining')
  })
})
