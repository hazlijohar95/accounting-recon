'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useAppStore, useSetProcessingDocumentsCount, useIsDemo, useSelectedCompanyId, useSetShowPaywall } from '@/lib/store'
import { FileText, AlertCircle, RefreshCw, X, FileUp, Trash2, Eye } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { LoadingSpinner, SuccessCheckmark, LogoMark, BrandedEmptyState } from '@/components/brand'
import { Id } from '@/convex/_generated/dataModel'
import { useCreateDocument, useTriggerExtraction, useDocument, useCompanyDocuments, useDeleteDocument } from '@/lib/convex-hooks'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useToast } from '@/components/ui/toast'
import { TabNav, TabPanel } from '@/components/ui/tab-nav'
import { Modal } from '@/components/ui/modal'
import { ExtractionStatus } from '@/components/extraction-status'

type FileStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'failed'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: 'bank_statement' | 'invoice' | 'receipt' | 'other'
  status: FileStatus
  progress: number
  documentId?: Id<"documents">
  errorMessage?: string
  file?: File
}

// File type labels mapping (shared across components)
const fileTypeLabels: Record<UploadedFile['type'], string> = {
  bank_statement: 'Bank Statement',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Document',
}

// Extraction status color styles (shared across components)
const statusColors: Record<string, string> = {
  pending: 'bg-secondary text-muted-foreground',
  processing: 'bg-info-light text-info',
  completed: 'bg-success-light text-success',
  failed: 'bg-error-light text-error',
}

export function UploadView() {
  return (
    <ErrorBoundary componentName="UploadView">
      <UploadViewContent />
    </ErrorBoundary>
  )
}

type UploadTab = 'upload' | 'documents'

function UploadViewContent() {
  // Use individual selectors to prevent unnecessary re-renders
  const isDemo = useIsDemo()
  const selectedCompanyId = useSelectedCompanyId()
  const setShowPaywall = useSetShowPaywall()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<UploadTab>('upload')
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Store XHR objects in ref to avoid storing non-serializable objects in state
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map())

  // Query documents for the Documents tab (using wrapper hook for consistency)
  const documents = useCompanyDocuments(
    activeTab === 'documents' ? selectedCompanyId as Id<"companies"> | undefined : undefined
  )

  // SECURITY: Cleanup XHR connections on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      xhrMapRef.current.forEach((xhr) => xhr.abort())
      xhrMapRef.current.clear()
    }
  }, [])

  // Toast notifications
  const toast = useToast()

  // Convex hooks (wrapper hooks for consistency)
  const createDocument = useCreateDocument()
  const triggerExtraction = useTriggerExtraction()

  // Detect document type from filename
  const detectDocumentType = (filename: string): UploadedFile['type'] => {
    const lower = filename.toLowerCase()
    if (lower.includes('statement') || lower.includes('bank')) return 'bank_statement'
    if (lower.includes('invoice') || lower.includes('inv')) return 'invoice'
    if (lower.includes('receipt') || lower.includes('rcpt')) return 'receipt'
    return 'other'
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: detectDocumentType(file.name),
      status: 'idle' as FileStatus,
      progress: 0,
      file,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

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

  // Upload file with real progress tracking
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
      // Create FormData
      const formData = new FormData()
      formData.append('file', fileData.file)
      formData.append('companyId', selectedCompanyId)
      formData.append('documentType', fileData.type)

      // Use XMLHttpRequest for real progress tracking
      const uploadResult = await new Promise<{
        storageId: string
        storageUrl: string
        fileType: string
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track progress
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
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error || 'Upload failed'))
              }
            } catch {
              reject(new Error('Invalid response from server'))
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText)
              reject(new Error(error.error || `Upload failed: ${xhr.status}`))
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`))
            }
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'))
        })

        // Store xhr reference in ref for potential cancellation (not in state)
        xhrMapRef.current.set(fileId, xhr)

        xhr.open('POST', '/api/upload')
        xhr.send(formData)
      })

      // Create document record in Convex
      const documentId = await createDocument({
        companyId: selectedCompanyId as Id<"companies">,
        fileName: fileData.name,
        fileType: uploadResult.fileType,
        fileSize: fileData.size,
        storageId: uploadResult.storageId,
        storageUrl: uploadResult.storageUrl,
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

      // Trigger extraction
      await triggerExtraction(documentId)

      toast.addToast({
        type: 'success',
        title: 'Upload complete',
        description: `${fileData.name} is being processed`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
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
        title: 'Upload failed',
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

  const processAll = () => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }
    const pendingFiles = files.filter((f) => f.status === 'idle')
    pendingFiles.forEach((f) => uploadFile(f.id))
  }

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

      {/* Tab Navigation */}
      <TabNav
        tabs={[
          { id: 'upload' as UploadTab, label: 'Upload New', count: pendingFilesCount || undefined },
          { id: 'documents' as UploadTab, label: 'Documents', count: documents?.length },
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
          <FileUp className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden="true" />
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
    </div>
  )
}

/**
 * Individual file item component with real-time status updates
 */
function FileItem({
  file,
  onUpload,
  onRetry,
  onCancel,
  onRemove,
}: {
  file: UploadedFile
  onUpload: () => void
  onRetry: () => void
  onCancel: () => void
  onRemove: () => void
}) {
  const toast = useToast()

  // Subscribe to document status updates (using wrapper hook for consistency)
  const document = useDocument(file.documentId)

  // Track previous extraction status to detect completion
  const prevStatusRef = useRef<string | null>(null)

  // Show toast when extraction completes
  useEffect(() => {
    const currentStatus = document?.extractionStatus
    const prevStatus = prevStatusRef.current

    // Detect transition to 'completed' status
    if (currentStatus === 'completed' && prevStatus !== 'completed' && prevStatus !== null) {
      const txCount = document?.extractedTransactionCount ?? 0
      toast.addToast({
        type: 'success',
        title: 'Extraction complete',
        description: `${file.name}: ${txCount} transactions extracted`,
        duration: 8000,
      })
    }

    // Detect transition to 'failed' status
    if (currentStatus === 'failed' && prevStatus !== 'failed' && prevStatus !== null) {
      toast.addToast({
        type: 'error',
        title: 'Extraction failed',
        description: document?.errorMessage || `${file.name} could not be processed`,
        duration: 10000,
      })
    }

    prevStatusRef.current = currentStatus || null
  }, [document?.extractionStatus, document?.extractedTransactionCount, document?.errorMessage, file.name, toast])

  // Update local status based on document status
  const displayStatus = document?.extractionStatus === 'completed'
    ? 'complete'
    : document?.extractionStatus === 'failed'
      ? 'failed'
      : file.status

  const errorMessage = document?.errorMessage || file.errorMessage

  return (
    <li className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors">
      {/* File info */}
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="flex-shrink-0 mt-0.5 sm:mt-0">
          <FileText className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{fileTypeLabels[file.type]}</span>
            {document?.extractedTransactionCount !== undefined && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span className="text-foreground font-medium">
                  {document.extractedTransactionCount} transactions
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status and actions */}
      <div className="flex items-center gap-3 sm:flex-shrink-0 pl-8 sm:pl-0">
        {displayStatus === 'idle' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onUpload}
              className="px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring"
            >
              Upload
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label={`Remove ${file.name}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {displayStatus === 'uploading' && (
          <div className="flex items-center gap-3" role="status">
            <div className="w-24 h-1.5 bg-secondary overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-150"
                style={{ width: `${file.progress}%` }}
                role="progressbar"
                aria-valuenow={file.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress: ${file.progress}%`}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-9">
              {file.progress}%
            </span>
            <button
              onClick={onCancel}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label="Cancel upload"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {displayStatus === 'processing' && (
          <div className="flex items-center gap-2" role="status" aria-label="Processing document">
            <LoadingSpinner size="sm" />
            <span className="text-xs text-muted-foreground">Extracting...</span>
          </div>
        )}

        {displayStatus === 'complete' && (
          <div className="flex items-center gap-2" role="status">
            <SuccessCheckmark size={16} animate={true} />
            <span className="text-xs text-success font-medium">Complete</span>
            {document?.extractionConfidence !== undefined && (
              <span className="text-xs text-muted-foreground">
                {Math.round(document.extractionConfidence)}%
              </span>
            )}
          </div>
        )}

        {displayStatus === 'failed' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-error">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span className="max-w-[150px] truncate" title={errorMessage}>
                {errorMessage || 'Failed'}
              </span>
            </div>
            <button
              onClick={onRetry}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label={`Retry upload for ${file.name}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label={`Remove ${file.name}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Batch Progress Bar - shows aggregate upload progress
 */
function BatchProgressBar({ files }: { files: UploadedFile[] }) {
  const stats = useMemo(() => {
    const total = files.length
    const completed = files.filter((f) => f.status === 'complete').length
    const processing = files.filter(
      (f) => f.status === 'processing' || f.status === 'uploading'
    ).length
    const progress =
      total > 0 ? Math.round(((completed + processing * 0.5) / total) * 100) : 0
    return { total, completed, processing, progress }
  }, [files])

  if (stats.total === 0) return null

  return (
    <div className="p-3 border border-border bg-secondary/20">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">Overall Progress</span>
        <span className="tabular-nums font-medium">
          {stats.completed}/{stats.total} complete
        </span>
      </div>
      <div className="h-1.5 bg-secondary overflow-hidden">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${stats.progress}%` }}
          role="progressbar"
          aria-valuenow={stats.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall batch progress: ${stats.progress}%`}
        />
      </div>
    </div>
  )
}

// Document type for the documents section
type DocumentItem = {
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

/**
 * Documents Section - displays uploaded documents list with management actions
 */
function DocumentsSection({
  documents,
  companyId,
  isDemo,
}: {
  documents: DocumentItem[] | undefined
  companyId: Id<"companies"> | null
  isDemo: boolean
}) {
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const deleteDocument = useDeleteDocument()
  const toast = useToast()

  // Demo mode shows mock list
  if (isDemo) {
    return <DemoDocumentsList />
  }

  // Loading state
  if (documents === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  // No company selected
  if (!companyId) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Select a company to view documents
        </p>
      </div>
    )
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <BrandedEmptyState
        variant="upload"
        title="No documents yet"
        description="Upload bank statements, invoices, or receipts to get started with reconciliation."
      />
    )
  }

  // Filter documents by type
  const filteredDocuments =
    filterType === 'all'
      ? documents
      : documents.filter((d) => d.documentType === filterType)

  const handleDelete = async (docId: Id<"documents">) => {
    try {
      await deleteDocument(docId)
      toast.addToast({
        type: 'success',
        title: 'Document deleted',
      })
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.addToast({
        type: 'error',
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="doc-type-filter" className="text-xs text-muted-foreground">
          Filter:
        </label>
        <select
          id="doc-type-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm bg-background border border-border px-2 py-1 focus-ring"
        >
          <option value="all">All Types</option>
          <option value="bank_statement">Bank Statements</option>
          <option value="invoice">Invoices</option>
          <option value="receipt">Receipts</option>
          <option value="other">Other</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Document list */}
      <ul className="border border-border divide-y divide-border" role="list">
        {filteredDocuments.map((doc) => (
          <DocumentListItem
            key={doc._id}
            document={doc}
            onSelect={() => setSelectedDoc(doc)}
            onDelete={() => handleDelete(doc._id)}
          />
        ))}
      </ul>

      {/* Detail modal */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={() => {
            handleDelete(selectedDoc._id)
            setSelectedDoc(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Document List Item - individual document row
 */
function DocumentListItem({
  document,
  onSelect,
  onDelete,
}: {
  document: DocumentItem
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <li className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors">
      {/* File info - clickable */}
      <button
        onClick={onSelect}
        className="flex items-start gap-3 flex-1 text-left min-w-0 focus-ring"
      >
        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" title={document.fileName}>
            {document.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(document.uploadedAt).toLocaleDateString()} · {formatFileSize(document.fileSize)}
            {document.extractedTransactionCount !== undefined && (
              <span className="ml-1">· {document.extractedTransactionCount} txns</span>
            )}
          </p>
        </div>
      </button>

      {/* Type badge */}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {fileTypeLabels[document.documentType as UploadedFile['type']] || document.documentType}
      </span>

      {/* Status badge */}
      <span
        className={cn(
          'px-2 py-0.5 text-xs font-medium capitalize',
          statusColors[document.extractionStatus] || 'bg-secondary text-muted-foreground'
        )}
      >
        {document.extractionStatus}
      </span>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="p-1.5 text-muted-foreground hover:text-error transition-colors focus-ring"
        aria-label={`Delete ${document.fileName}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  )
}

/**
 * Document Detail Modal - shows document details with retry/delete actions
 */
function DocumentDetailModal({
  document,
  onClose,
  onDelete,
}: {
  document: DocumentItem
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <Modal isOpen onClose={onClose} title="Document Details" size="md">
      <div className="space-y-4">
        {/* File info */}
        <div>
          <h3 className="font-medium text-sm">{document.fileName}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {formatFileSize(document.fileSize)} · {fileTypeLabels[document.documentType as UploadedFile['type']] || document.documentType}
          </p>
          <p className="text-xs text-muted-foreground">
            Uploaded {new Date(document.uploadedAt).toLocaleString()}
          </p>
        </div>

        {/* Extraction status with full details */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Extraction Status
          </h4>
          <ExtractionStatus documentId={document._id} showDetails />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs text-error border border-error/30 hover:bg-error/10 transition-colors focus-ring"
          >
            Delete Document
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Demo Documents List - mock documents for demo mode
 */
function DemoDocumentsList() {
  const mockDocuments = [
    {
      id: '1',
      name: 'Maybank_Statement_Jan2024.pdf',
      type: 'Bank Statement',
      date: 'Jan 15, 2024',
      status: 'completed',
      transactions: 47,
    },
    {
      id: '2',
      name: 'Invoice_ACME_Corp_001.pdf',
      type: 'Invoice',
      date: 'Jan 12, 2024',
      status: 'completed',
      transactions: 1,
    },
    {
      id: '3',
      name: 'CIMB_Statement_Dec2023.pdf',
      type: 'Bank Statement',
      date: 'Jan 10, 2024',
      status: 'processing',
      transactions: undefined,
    },
    {
      id: '4',
      name: 'Receipt_Office_Supplies.jpg',
      type: 'Receipt',
      date: 'Jan 8, 2024',
      status: 'completed',
      transactions: 1,
    },
  ]

  const setShowPaywall = useSetShowPaywall()

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Demo mode: Sample documents shown below
      </p>

      <ul className="border border-border divide-y divide-border" role="list">
        {mockDocuments.map((doc) => (
          <li
            key={doc.id}
            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.date}
                  {doc.transactions !== undefined && (
                    <span className="ml-1">· {doc.transactions} txns</span>
                  )}
                </p>
              </div>
            </div>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              {doc.type}
            </span>

            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium capitalize',
                statusColors[doc.status]
              )}
            >
              {doc.status}
            </span>

            <button
              onClick={() => setShowPaywall(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label="View document"
            >
              <Eye className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="text-center py-4">
        <button
          onClick={() => setShowPaywall(true)}
          className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors focus-ring"
        >
          Sign up to manage your documents
        </button>
      </div>
    </div>
  )
}
