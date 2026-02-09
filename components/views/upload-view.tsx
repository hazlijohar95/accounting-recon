'use client'

import { useRouter } from 'next/navigation'
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  useAppStore,
  useSetProcessingDocumentsCount,
  useIsDemo,
  useSelectedCompanyId,
  useSetShowPaywall,
  useActiveSession,
  useCompanies,
  useCurrentUser,
} from '@/lib/store'
import {
  IconCloudUpload,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/brand'
import { Id } from '@/convex/_generated/dataModel'
import { useCreateDocument, useTriggerExtraction, useCompanyDocuments, useGenerateUploadUrl } from '@/lib/convex-hooks'
import { usePdfExtraction, isPdfFile } from '@/hooks/usePdfExtraction'
import { useGeminiExtraction } from '@/hooks/useGeminiExtraction'
import { useUploadAnalysis } from '@/hooks/useUploadAnalysis'
import { UploadAnalysisPanel } from './upload-view/upload-analysis-panel'

const EXTRACTION_PROVIDER = process.env.NEXT_PUBLIC_EXTRACTION_PROVIDER || 'bedrock'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useToast } from '@/components/ui/toast'
import { TabNav, TabPanel } from '@/components/ui/tab-nav'
import type { UploadedFile, FileStatus, UploadTab } from './upload-view/types'
import { FileItem } from './upload-view/file-item'
import { BatchProgressBar } from './upload-view/batch-progress-bar'
import { DocumentsSection } from './upload-view/documents-section'

// SECURITY: File validation constants (must match convex/documents.ts)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'csv', 'xls', 'xlsx']

/**
 * SECURITY: Sanitize filename to prevent path traversal and injection attacks
 * - Removes directory separators (/, \, ..)
 * - Removes null bytes and control characters
 * - Limits length to 255 characters
 * - Preserves file extension
 */
function sanitizeFilename(filename: string): string {
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

export function UploadView() {
  return (
    <ErrorBoundary componentName="UploadView">
      <UploadViewContent />
    </ErrorBoundary>
  )
}

function UploadViewContent() {
  const router = useRouter()
  // Use individual selectors to prevent unnecessary re-renders
  const isDemo = useIsDemo()
  const selectedCompanyId = useSelectedCompanyId()
  const activeSession = useActiveSession()
  const companies = useCompanies()
  const setShowPaywall = useSetShowPaywall()
  const currentUser = useCurrentUser()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<UploadTab>('upload')
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Store XHR objects in ref to avoid storing non-serializable objects in state
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map())

  // Query documents for the Documents tab (using wrapper hook for consistency)
  const documents = useCompanyDocuments(
    selectedCompanyId as Id<"companies"> | undefined
  )
  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return 'No company selected'
    return companies.find((c) => c.id === selectedCompanyId)?.name || 'Selected company'
  }, [companies, selectedCompanyId])

  // SECURITY: Cleanup XHR connections on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      xhrMapRef.current.forEach((xhr) => xhr.abort())
      xhrMapRef.current.clear()
    }
  }, [])

  // Upload analysis hook (AI classification + company verification)
  const uploadAnalysis = useUploadAnalysis({
    companyId: selectedCompanyId as Id<"companies"> | null,
    enabled: !isDemo,
  })
  const [isApproving, setIsApproving] = useState(false)

  // Toast notifications
  const toast = useToast()

  // Convex hooks (wrapper hooks for consistency)
  const generateUploadUrl = useGenerateUploadUrl()
  const createDocument = useCreateDocument()
  const triggerExtraction = useTriggerExtraction()

  // Extraction callbacks (shared between Bedrock and Gemini)
  const extractionCallbacks = useMemo(() => ({
    onProgress: (progress: { currentPage?: number; totalPages?: number; phase: string; message?: string }) => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status === 'processing' && f.file && isPdfFile(f.file)) {
            const pct = progress.currentPage && progress.totalPages
              ? Math.round((progress.currentPage / progress.totalPages) * 100)
              : undefined
            return {
              ...f,
              progress: pct ?? f.progress,
              progressMessage: progress.message || f.progressMessage,
            }
          }
          return f
        })
      )
    },
    onComplete: (documentId: Id<"documents">, transactionCount: number) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.documentId === documentId
            ? { ...f, status: 'complete' as FileStatus, progressMessage: undefined }
            : f
        )
      )
      toast.addToast({
        type: 'success',
        title: 'Extraction complete',
        description: `${transactionCount} transactions extracted.`,
      })
      // No auto-redirect — analysis panel handles navigation after user review
    },
    onError: (documentId: Id<"documents"> | null, error: string) => {
      if (documentId) {
        setFiles((prev) =>
          prev.map((f) =>
            f.documentId === documentId
              ? { ...f, status: 'failed' as FileStatus, errorMessage: error, progressMessage: undefined }
              : f
          )
        )
      }
      toast.addToast({
        type: 'error',
        title: 'Extraction failed',
        description: error,
      })
    },
    skipSessionCreation: true, // Session creation handled by analysis approval
  }), [toast])

  // Both hooks are always called (React rules of hooks), but only the active one is used
  const bedrockExtraction = usePdfExtraction(extractionCallbacks)
  const geminiExtraction = useGeminiExtraction(extractionCallbacks)

  const { extractPdf } = EXTRACTION_PROVIDER === 'gemini' ? geminiExtraction : bedrockExtraction

  // Detect document type from filename
  const detectDocumentType = (filename: string): UploadedFile['type'] => {
    const lower = filename.toLowerCase()
    if (lower.includes('statement') || lower.includes('bank')) return 'bank_statement'
    if (lower.includes('invoice') || lower.includes('inv')) return 'invoice'
    if (lower.includes('receipt') || lower.includes('rcpt')) return 'receipt'
    return 'other'
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = []
    const rejectedFiles: { name: string; reason: string }[] = []

    Array.from(fileList).forEach((file) => {
      // SECURITY: Validate file size before upload
      if (file.size > MAX_FILE_SIZE) {
        rejectedFiles.push({
          name: file.name,
          reason: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        })
        return
      }

      // SECURITY: Validate file type by extension and MIME type
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        rejectedFiles.push({
          name: file.name,
          reason: `Invalid file type (.${extension})`,
        })
        return
      }

      // Also check MIME type (can be spoofed, but adds defense in depth)
      if (!ALLOWED_CONTENT_TYPES.includes(file.type) && file.type !== '') {
        rejectedFiles.push({
          name: file.name,
          reason: `Invalid content type (${file.type})`,
        })
        return
      }

      // SECURITY: Sanitize filename
      const sanitizedName = sanitizeFilename(file.name)

      newFiles.push({
        id: crypto.randomUUID(),
        name: sanitizedName,
        size: file.size,
        type: detectDocumentType(sanitizedName),
        status: 'idle' as FileStatus,
        progress: 0,
        file,
      })
    })

    // Show error toast for rejected files
    if (rejectedFiles.length > 0) {
      const message = rejectedFiles.length === 1
        ? `${rejectedFiles[0].name}: ${rejectedFiles[0].reason}`
        : `${rejectedFiles.length} files rejected`
      toast.addToast({
        type: 'error',
        title: 'Files rejected',
        description: message,
        duration: 8000,
      })
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [toast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  // Keyboard handler for drop zone
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }, [])

  // Upload file using Convex file storage
  const uploadFile = async (fileId: string) => {
    // Demo mode: simulate upload progress then show paywall
    if (isDemo) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'uploading' as FileStatus, progress: 0 } : f
        )
      )

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 50))
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: i } : f))
        )
      }

      // Reset file and show paywall
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'idle' as FileStatus, progress: 0 } : f
        )
      )
      setShowPaywall(true)
      toast.addToast({
        type: 'info',
        title: 'Sign up to process documents',
        description: 'Create an account to extract and reconcile your data',
      })
      return
    }

    if (!selectedCompanyId) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'failed' as FileStatus, errorMessage: 'No company selected' }
            : f
        )
      )
      toast.addToast({
        type: 'error',
        title: 'Upload failed',
        description: 'Please select a company first',
      })
      return
    }

    const fileData = files.find((f) => f.id === fileId)
    if (!fileData?.file) return

    // Update to uploading state
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: 'uploading' as FileStatus, progress: 0 } : f))
    )

    try {
      // Check if this is a PDF - use native extraction (Gemini or Bedrock)
      if (isPdfFile(fileData.file)) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? {
            ...f,
            status: 'processing' as FileStatus,
            progress: 0,
            progressMessage: 'Starting extraction...',
          } : f))
        )

        const documentId = await extractPdf(
          fileData.file,
          selectedCompanyId as Id<"companies">,
          fileData.type
        )

        if (documentId) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, documentId, status: 'complete' as FileStatus, progressMessage: undefined }
                : f
            )
          )
          // Auto-switch to Documents tab after successful extraction
          setActiveTab('documents')
        }
        // Error handling is done in extraction hook's onError callback
        return
      }

      // For non-PDF files (images, CSV, Excel), use the standard upload flow
      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl({
        companyId: selectedCompanyId as Id<"companies">,
      })

      // Step 2: Upload file directly to Convex storage using fetch with progress
      // Note: fetch doesn't support upload progress, so we use XHR for progress tracking
      const storageId = await new Promise<Id<"_storage">>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, progress: percentComplete } : f
              )
            )
          }
        })

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.storageId) {
                resolve(response.storageId as Id<"_storage">)
              } else {
                reject(new Error('No storageId in response'))
              }
            } catch {
              reject(new Error('Invalid response from storage'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'))
        })

        // Store xhr reference for potential cancellation
        xhrMapRef.current.set(fileId, xhr)

        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Content-Type', fileData.file!.type)
        xhr.send(fileData.file)
      })

      // Get file extension
      const fileExtension = fileData.name.split('.').pop()?.toLowerCase() || ''

      // Step 3: Create document record in Convex
      const documentId = await createDocument({
        companyId: selectedCompanyId as Id<"companies">,
        fileName: fileData.name,
        fileType: fileExtension,
        fileSize: fileData.size,
        contentType: fileData.file!.type,
        storageId,
        documentType: fileData.type,
      })

      // Clear XHR reference and update file with document ID, switch to processing
      xhrMapRef.current.delete(fileId)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'processing' as FileStatus, documentId }
            : f
        )
      )

      // Step 4: Trigger extraction (Cloudinary for images only now)
      await triggerExtraction(documentId)

      toast.addToast({
        type: 'success',
        title: 'Upload complete',
        description: `${fileData.name} is being processed`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      const rawMessage = error instanceof Error ? error.message : 'Upload failed'

      // SECURITY: Provide user-friendly error messages without leaking internals
      let errorTitle = 'Upload failed'
      let errorMessage = rawMessage

      if (rawMessage.includes('Rate limit exceeded')) {
        errorTitle = 'Too many uploads'
        errorMessage = 'Please wait a moment before uploading more files'
      } else if (rawMessage.includes('File type not allowed')) {
        errorTitle = 'Invalid file type'
        errorMessage = 'Please upload PDF, CSV, Excel, or image files only'
      } else if (rawMessage.includes('File too large')) {
        errorTitle = 'File too large'
        errorMessage = 'Maximum file size is 50MB'
      } else if (rawMessage.includes('Authentication') || rawMessage.includes('Unauthorized')) {
        errorTitle = 'Session expired'
        errorMessage = 'Please refresh the page and try again'
      }

      // Clear XHR reference on error
      xhrMapRef.current.delete(fileId)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'failed' as FileStatus, errorMessage }
            : f
        )
      )
      toast.addToast({
        type: 'error',
        title: errorTitle,
        description: errorMessage,
      })
    }
  }

  const cancelUpload = (fileId: string) => {
    // Abort XHR from ref (not state)
    const xhr = xhrMapRef.current.get(fileId)
    if (xhr) {
      xhr.abort()
      xhrMapRef.current.delete(fileId)
    }
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'idle' as FileStatus, progress: 0 }
          : f
      )
    )
  }

  const removeFile = (fileId: string) => {
    // Abort XHR from ref (not state) if upload is in progress
    const xhr = xhrMapRef.current.get(fileId)
    if (xhr) {
      xhr.abort()
      xhrMapRef.current.delete(fileId)
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const retryUpload = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'idle' as FileStatus, progress: 0, errorMessage: undefined }
          : f
      )
    )
    uploadFile(fileId)
  }

  const processAll = async () => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }
    const pendingFiles = files.filter((f) => f.status === 'idle')
    pendingFiles.forEach((f) => uploadFile(f.id))

    // Create analysis batch after kicking off uploads
    // Document IDs will be collected as extractions complete
    // For now, we'll create the batch after first file gets a documentId
  }

  // Track document IDs and create/update analysis batch
  const analysisDocIdsRef = useRef<Set<string>>(new Set())
  const analysisBatchCreatedRef = useRef(false)

  useEffect(() => {
    if (isDemo || !selectedCompanyId) return

    // Collect document IDs from completed files
    const completedDocIds = files
      .filter((f) => f.documentId && (f.status === 'complete' || f.status === 'processing'))
      .map((f) => f.documentId!)

    if (completedDocIds.length === 0) return

    // Check for new document IDs
    const newDocIds = completedDocIds.filter((id) => !analysisDocIdsRef.current.has(id))
    if (newDocIds.length === 0) return

    // Track them
    newDocIds.forEach((id) => analysisDocIdsRef.current.add(id))

    // Create or update analysis batch
    if (!analysisBatchCreatedRef.current) {
      analysisBatchCreatedRef.current = true
      uploadAnalysis.createBatch(completedDocIds).then(() => {
        setActiveTab('analysis')
      }).catch((err) => {
        console.error('[UploadView] Failed to create analysis batch:', err)
        analysisBatchCreatedRef.current = false
      })
    } else if (uploadAnalysis.analysisId) {
      uploadAnalysis.addDocuments(newDocIds).catch((err) => {
        console.error('[UploadView] Failed to add documents to analysis:', err)
      })
    }
  }, [files, isDemo, selectedCompanyId, uploadAnalysis.analysisId])

  // Reset analysis tracking when files are cleared
  useEffect(() => {
    if (files.length === 0) {
      analysisDocIdsRef.current.clear()
      analysisBatchCreatedRef.current = false
    }
  }, [files.length])

  const idleCount = files.filter((f) => f.status === 'idle').length
  const processingCount = files.filter((f) => f.status === 'uploading' || f.status === 'processing').length
  const setProcessingDocumentsCount = useSetProcessingDocumentsCount()

  // Update global processing count for sidebar badge
  useEffect(() => {
    setProcessingDocumentsCount(processingCount)
    return () => setProcessingDocumentsCount(0) // Clear on unmount
  }, [processingCount, setProcessingDocumentsCount])

  // Compute pending file count for tab badge
  const pendingFilesCount = files.filter((f) => f.status !== 'complete').length

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-lg font-medium tracking-tight">Upload Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bank statements, invoices, and receipts for reconciliation
        </p>
      </header>

      {/* Context bar - compact single row */}
      <div className="border border-border bg-secondary/20 px-4 py-2.5 flex items-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Company:</span>
          <span className="font-medium">{selectedCompanyName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Session:</span>
          <span className="font-medium">{activeSession?.name || 'None'}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNav
        tabs={[
          { id: 'upload' as UploadTab, label: 'Upload New', count: pendingFilesCount || undefined },
          { id: 'documents' as UploadTab, label: 'Documents', count: documents?.length },
          ...(uploadAnalysis.analysisId
            ? [{ id: 'analysis' as UploadTab, label: 'Analysis', count: uploadAnalysis.analysis?.documentClassifications?.length }]
            : []),
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as UploadTab)}
        ariaLabel="Upload navigation"
      />

      {/* Upload Tab */}
      <TabPanel tabId="upload" activeTab={activeTab} className="space-y-6">
        {/* Batch Progress Bar */}
        <BatchProgressBar files={files} />

        {/* Upload Zone - Fully accessible */}
        <div
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        aria-label="Upload documents. Press Enter or Space to browse files, or drag and drop files here."
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all',
          'drop-zone-focus',
          isDragging
            ? 'border-foreground bg-secondary/50 scale-[1.01]'
            : 'border-border hover:border-muted-foreground hover:bg-secondary/20'
        )}
      >
        {/* Logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
          <LogoMark size={160} />
        </div>

        {/* Upload icon with animation on drag */}
        <div className={cn(
          'relative transition-transform duration-200',
          isDragging && 'scale-110 -translate-y-1'
        )}>
          <IconCloudUpload size={40} className="mx-auto text-muted-foreground" aria-hidden="true" />
        </div>

        <p className="mt-4 text-sm font-medium relative">
          {isDragging ? 'Drop files to upload' : 'Drag and drop files here'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground relative">
          PDF, CSV, XLS, or images up to 50MB
        </p>

        {/* Browse button - visual only, click handled by parent */}
        <div className="mt-4 relative">
          <span className="px-4 py-2 bg-foreground text-background text-sm inline-block">
            Browse Files
          </span>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <section aria-label="Uploaded files">
          <div className="border border-border">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-secondary/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {files.length} {files.length === 1 ? 'File' : 'Files'}
                </span>
                {processingCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {processingCount} processing
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {idleCount > 0 && (
                  <button
                    onClick={processAll}
                    className="px-4 py-2 bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors focus-ring"
                  >
                    Process All ({idleCount})
                  </button>
                )}
                <button
                  onClick={() => setFiles([])}
                  className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* File items */}
            <ul className="divide-y divide-border" role="list">
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  onUpload={() => uploadFile(file.id)}
                  onRetry={() => retryUpload(file.id)}
                  onCancel={() => cancelUpload(file.id)}
                  onRemove={() => removeFile(file.id)}
                />
              ))}
            </ul>
          </div>
        </section>
      )}
      </TabPanel>

      {/* Documents Tab */}
      <TabPanel tabId="documents" activeTab={activeTab}>
        <DocumentsSection
          documents={documents}
          companyId={selectedCompanyId as Id<"companies"> | null}
          isDemo={isDemo}
        />
      </TabPanel>

      {/* Analysis Tab */}
      {uploadAnalysis.analysisId && (
        <TabPanel tabId="analysis" activeTab={activeTab}>
          <UploadAnalysisPanel
            phase={uploadAnalysis.phase}
            detectedCompany={uploadAnalysis.analysis?.detectedCompany ?? undefined}
            documentClassifications={uploadAnalysis.analysis?.documentClassifications ?? []}
            stats={uploadAnalysis.analysis?.stats ?? undefined}
            currentCompanyName={selectedCompanyName}
            extractionProgress={uploadAnalysis.extractionProgress}
            onReclassify={(docId, classification, basisType) => {
              uploadAnalysis.reclassify(docId, classification, basisType)
            }}
            onProceed={async () => {
              setIsApproving(true)
              try {
                const sessionId = await uploadAnalysis.approve()
                toast.addToast({
                  type: 'success',
                  title: 'Session created',
                  description: 'Redirecting to reconciliation...',
                })
                setTimeout(() => {
                  router.push(`/reconcile?sessionId=${sessionId}`)
                }, 500)
              } catch (err) {
                toast.addToast({
                  type: 'error',
                  title: 'Failed to create session',
                  description: err instanceof Error ? err.message : 'Unknown error',
                })
              } finally {
                setIsApproving(false)
              }
            }}
            onDismiss={async () => {
              try {
                await uploadAnalysis.dismiss()
                setActiveTab('upload')
                toast.addToast({
                  type: 'info',
                  title: 'Analysis skipped',
                  description: 'You can manually create a reconciliation session',
                })
              } catch (err) {
                console.error('[UploadView] Failed to dismiss analysis:', err)
              }
            }}
            isApproving={isApproving}
          />
        </TabPanel>
      )}
    </div>
  )
}
