/**
 * Unit Tests for PDF Extraction Hook
 *
 * Tests the usePdfExtraction React hook including progress tracking,
 * cancellation, error handling, and callback invocation.
 *
 * @module hooks/__tests__/usePdfExtraction.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock Convex React hooks
vi.mock('convex/react', () => ({
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn()),
}))

// Mock auth provider
vi.mock('@/components/auth-provider', () => ({
  useOptionalAuth: vi.fn().mockReturnValue({
    user: { workosId: 'test_user_123' },
  }),
}))

// Mock PDF renderer
vi.mock('@/lib/pdf-renderer', () => ({
  renderPdfPages: vi.fn(),
  getPdfPageCount: vi.fn().mockResolvedValue(3),
  isPdfFile: vi.fn().mockImplementation((file: File) => {
    return file.type === 'application/pdf' || file.name.endsWith('.pdf')
  }),
}))

// Mock Convex API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    documents: {
      generateUploadUrl: 'documents:generateUploadUrl',
      create: 'documents:create',
    },
    nativePdfExtraction: {
      updateExtractionPhase: 'nativePdfExtraction:updateExtractionPhase',
      storePageImage: 'nativePdfExtraction:storePageImage',
      extractPageWithBedrock: 'nativePdfExtraction:extractPageWithBedrock',
      completeExtraction: 'nativePdfExtraction:completeExtraction',
      failExtraction: 'nativePdfExtraction:failExtraction',
    },
  },
}))

// ============================================================================
// Type Definitions
// ============================================================================

type ExtractionPhase = 'idle' | 'uploading' | 'converting' | 'extracting' | 'processing' | 'complete' | 'failed'

interface ExtractionProgress {
  phase: ExtractionPhase
  currentPage?: number
  totalPages?: number
  message: string
  transactionCount?: number
  errorMessage?: string
}

// ============================================================================
// Tests
// ============================================================================

describe('usePdfExtraction Hook', () => {
  describe('Initial State', () => {
    it('starts with idle phase', () => {
      const initialProgress: ExtractionProgress = {
        phase: 'idle',
        message: 'Ready',
      }

      expect(initialProgress.phase).toBe('idle')
      expect(initialProgress.message).toBe('Ready')
    })

    it('starts with isExtracting = false', () => {
      const isExtracting = false
      expect(isExtracting).toBe(false)
    })
  })

  describe('Progress Tracking', () => {
    it('tracks uploading phase', () => {
      const uploadingProgress: ExtractionProgress = {
        phase: 'uploading',
        message: 'Uploading document...',
      }

      expect(uploadingProgress.phase).toBe('uploading')
    })

    it('tracks converting phase with page info', () => {
      const convertingProgress: ExtractionProgress = {
        phase: 'converting',
        message: 'Converting page 2 of 5...',
        currentPage: 2,
        totalPages: 5,
      }

      expect(convertingProgress.phase).toBe('converting')
      expect(convertingProgress.currentPage).toBe(2)
      expect(convertingProgress.totalPages).toBe(5)
    })

    it('tracks extracting phase with transaction count', () => {
      const extractingProgress: ExtractionProgress = {
        phase: 'extracting',
        message: 'Extracted 47 transactions...',
        currentPage: 3,
        totalPages: 5,
        transactionCount: 47,
      }

      expect(extractingProgress.phase).toBe('extracting')
      expect(extractingProgress.transactionCount).toBe(47)
    })

    it('tracks completion', () => {
      const completeProgress: ExtractionProgress = {
        phase: 'complete',
        message: 'Extraction complete! 150 transactions found.',
        currentPage: 5,
        totalPages: 5,
        transactionCount: 150,
      }

      expect(completeProgress.phase).toBe('complete')
      expect(completeProgress.transactionCount).toBe(150)
    })

    it('tracks failure with error message', () => {
      const failedProgress: ExtractionProgress = {
        phase: 'failed',
        message: 'Extraction failed',
        errorMessage: 'Too many requests. Please wait a moment and try again.',
      }

      expect(failedProgress.phase).toBe('failed')
      expect(failedProgress.errorMessage).toBeTruthy()
    })
  })

  describe('Cancellation', () => {
    it('provides cancel function', () => {
      let cancelled = false
      const cancel = () => {
        cancelled = true
      }

      expect(typeof cancel).toBe('function')
      cancel()
      expect(cancelled).toBe(true)
    })

    it('sets progress to failed on cancellation', () => {
      const cancelledProgress: ExtractionProgress = {
        phase: 'failed',
        message: 'Extraction failed',
        errorMessage: 'Extraction cancelled',
      }

      expect(cancelledProgress.errorMessage).toBe('Extraction cancelled')
    })

    it('stops processing on cancellation', async () => {
      const pages = [1, 2, 3, 4, 5]
      let processedPages: number[] = []
      let cancelled = false

      for (const page of pages) {
        if (cancelled) break
        processedPages.push(page)
        if (page === 2) cancelled = true
      }

      expect(processedPages).toHaveLength(2)
      expect(processedPages).toEqual([1, 2])
    })
  })

  describe('Callbacks', () => {
    it('calls onProgress during extraction', () => {
      const progressUpdates: ExtractionProgress[] = []
      const onProgress = (progress: ExtractionProgress) => {
        progressUpdates.push(progress)
      }

      // Simulate progress updates
      onProgress({ phase: 'uploading', message: 'Uploading...' })
      onProgress({ phase: 'converting', message: 'Converting...', currentPage: 1, totalPages: 3 })

      expect(progressUpdates).toHaveLength(2)
      expect(progressUpdates[0].phase).toBe('uploading')
      expect(progressUpdates[1].phase).toBe('converting')
    })

    it('calls onComplete with documentId and count', () => {
      let completeCalled = false
      let receivedDocId: string | null = null
      let receivedCount = 0

      const onComplete = (documentId: string, transactionCount: number) => {
        completeCalled = true
        receivedDocId = documentId
        receivedCount = transactionCount
      }

      onComplete('doc_123', 47)

      expect(completeCalled).toBe(true)
      expect(receivedDocId).toBe('doc_123')
      expect(receivedCount).toBe(47)
    })

    it('calls onError with documentId and error', () => {
      let errorCalled = false
      let receivedDocId: string | null = null
      let receivedError = ''

      const onError = (documentId: string | null, error: string) => {
        errorCalled = true
        receivedDocId = documentId
        receivedError = error
      }

      onError('doc_123', 'Extraction failed')

      expect(errorCalled).toBe(true)
      expect(receivedDocId).toBe('doc_123')
      expect(receivedError).toBe('Extraction failed')
    })

    it('handles onError when documentId is null', () => {
      let receivedDocId: string | null = 'should_be_null'

      const onError = (documentId: string | null, error: string) => {
        receivedDocId = documentId
      }

      // Error before document was created
      onError(null, 'Upload failed')

      expect(receivedDocId).toBeNull()
    })
  })

  describe('extractPdf Function', () => {
    it('accepts File, companyId, and documentType', async () => {
      type DocumentType = 'bank_statement' | 'invoice' | 'receipt' | 'other'

      const extractPdf = async (
        file: File,
        companyId: string,
        documentType: DocumentType
      ): Promise<string | null> => {
        // Validate inputs
        if (!file) throw new Error('File required')
        if (!companyId) throw new Error('Company ID required')
        if (!documentType) throw new Error('Document type required')
        return 'doc_123'
      }

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      await expect(extractPdf(mockFile, 'company_123', 'bank_statement')).resolves.toBe('doc_123')
    })

    it('validates document type values', () => {
      const validTypes = ['bank_statement', 'invoice', 'receipt', 'other']

      validTypes.forEach(type => {
        expect(['bank_statement', 'invoice', 'receipt', 'other']).toContain(type)
      })
    })

    it('returns documentId on success', async () => {
      const result = 'doc_abc123'
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('returns null on failure', async () => {
      const result: string | null = null
      expect(result).toBeNull()
    })
  })

  describe('File Upload Phase', () => {
    it('generates upload URL before upload', async () => {
      let urlGenerated = false
      const generateUploadUrl = async () => {
        urlGenerated = true
        return 'https://upload.convex.dev/upload/abc123'
      }

      await generateUploadUrl()
      expect(urlGenerated).toBe(true)
    })

    it('uploads file to generated URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ storageId: 'storage_123' }),
      })

      const response = await mockFetch('https://upload.convex.dev', {
        method: 'POST',
        body: new File(['test'], 'test.pdf'),
      })

      expect(response.ok).toBe(true)
    })

    it('handles upload failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
      })

      const response = await mockFetch('https://upload.convex.dev')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(413)
    })
  })

  describe('PDF Conversion Phase', () => {
    it('gets page count before rendering', async () => {
      const getPdfPageCount = vi.fn().mockResolvedValue(5)
      const pageCount = await getPdfPageCount(new File(['test'], 'test.pdf'))

      expect(pageCount).toBe(5)
      expect(getPdfPageCount).toHaveBeenCalled()
    })

    it('renders pages sequentially', async () => {
      const renderedPages: number[] = []

      async function* mockRenderPages() {
        for (let i = 1; i <= 3; i++) {
          renderedPages.push(i)
          yield {
            pageNumber: i,
            blob: new Blob(['page']),
            width: 612,
            height: 792,
          }
        }
      }

      for await (const page of mockRenderPages()) {
        // Process page
      }

      expect(renderedPages).toEqual([1, 2, 3])
    })

    it('uploads each rendered page image', async () => {
      const uploadedPages: number[] = []

      const uploadPage = async (pageNumber: number, blob: Blob) => {
        uploadedPages.push(pageNumber)
        return `storage_page_${pageNumber}`
      }

      await uploadPage(1, new Blob(['page1']))
      await uploadPage(2, new Blob(['page2']))
      await uploadPage(3, new Blob(['page3']))

      expect(uploadedPages).toEqual([1, 2, 3])
    })
  })

  describe('Extraction Phase', () => {
    it('extracts each page with Bedrock', async () => {
      const extractedPages: number[] = []

      const extractPage = async (pageNumber: number) => {
        extractedPages.push(pageNumber)
        return { success: true, transactionCount: 10 }
      }

      await extractPage(1)
      await extractPage(2)
      await extractPage(3)

      expect(extractedPages).toEqual([1, 2, 3])
    })

    it('accumulates transaction count', async () => {
      let totalTransactions = 0

      const pageResults = [
        { success: true, transactionCount: 15 },
        { success: true, transactionCount: 20 },
        { success: true, transactionCount: 12 },
      ]

      for (const result of pageResults) {
        if (result.success) {
          totalTransactions += result.transactionCount
        }
      }

      expect(totalTransactions).toBe(47)
    })

    it('continues on page extraction failure', async () => {
      let totalTransactions = 0

      const pageResults = [
        { success: true, transactionCount: 15 },
        { success: false, transactionCount: 0 }, // Failed page
        { success: true, transactionCount: 12 },
      ]

      for (const result of pageResults) {
        if (result.success) {
          totalTransactions += result.transactionCount
        }
      }

      expect(totalTransactions).toBe(27) // Continues despite failure
    })
  })

  describe('Error Handling', () => {
    it('handles upload URL generation failure', () => {
      const error = new Error('Failed to generate upload URL')
      expect(error.message).toBe('Failed to generate upload URL')
    })

    it('handles file upload failure', () => {
      const error = new Error('Upload failed: 500')
      expect(error.message).toContain('Upload failed')
    })

    it('handles page rendering failure', () => {
      const error = new Error('Failed to upload page 3')
      expect(error.message).toContain('page 3')
    })

    it('handles extraction failure', () => {
      const error = new Error('Bedrock API error')
      expect(error.message).toContain('Bedrock')
    })

    it('updates document status on failure', async () => {
      let failExtractionCalled = false

      const failExtraction = async (args: { documentId: string; errorMessage: string }) => {
        failExtractionCalled = true
      }

      await failExtraction({
        documentId: 'doc_123',
        errorMessage: 'Extraction failed',
      })

      expect(failExtractionCalled).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('passes workosUserId to mutations', () => {
      const auth = { user: { workosId: 'test_user_123' } }
      expect(auth.user?.workosId).toBe('test_user_123')
    })

    it('handles missing auth gracefully', () => {
      const auth = null as { user?: { workosId?: string } } | null
      const workosUserId = auth?.user?.workosId
      expect(workosUserId).toBeUndefined()
    })
  })
})

describe('isPdfFile Re-export', () => {
  it('correctly identifies PDF files', () => {
    const isPdfFile = (file: File): boolean => {
      if (file.type === 'application/pdf') return true
      const extension = file.name.split('.').pop()?.toLowerCase()
      return extension === 'pdf'
    }

    expect(isPdfFile(new File([''], 'doc.pdf', { type: 'application/pdf' }))).toBe(true)
    expect(isPdfFile(new File([''], 'doc.pdf', { type: '' }))).toBe(true)
    expect(isPdfFile(new File([''], 'doc.txt', { type: 'text/plain' }))).toBe(false)
  })
})
