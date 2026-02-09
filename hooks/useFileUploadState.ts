/**
 * Custom hook for managing file upload state
 *
 * Centralizes file state, XHR tracking, validation, deduplication,
 * and update patterns. Used by upload-view.tsx.
 *
 * @module hooks/useFileUploadState
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  FILE_STATUS,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_CONTENT_TYPES,
  type FileStatus,
  type DocumentType,
} from '@/lib/constants/upload'
import {
  sanitizeFilename,
  detectDocumentType,
  getFileStats,
  type UploadedFile,
  type FileStats,
} from '@/lib/fileUtils'

export type { UploadedFile, FileStats }

interface FileValidationResult {
  valid: UploadedFile[]
  rejected: { name: string; reason: string }[]
}

interface UseFileUploadStateOptions {
  /** Default document type for new files, or 'auto' to detect from filename */
  defaultDocType?: DocumentType | 'auto'
}

interface UseFileUploadStateReturn {
  /** Current list of files */
  files: UploadedFile[]
  /** File statistics */
  stats: FileStats
  /** Add new files from FileList (validates, sanitizes, deduplicates) */
  addFiles: (fileList: FileList) => FileValidationResult
  /** Update a single file by ID */
  updateFile: (fileId: string, updates: Partial<UploadedFile>) => void
  /** Update a file matched by documentId (for extraction progress callbacks) */
  updateFileByDocumentId: (documentId: string, updates: Partial<UploadedFile>) => void
  /** Remove a file by ID (aborts any active XHR) */
  removeFile: (fileId: string) => void
  /** Clear all files */
  clearFiles: () => void
  /** Set file to uploading state */
  setFileUploading: (fileId: string) => void
  /** Set file to processing state with optional progress message */
  setFileProcessing: (fileId: string, opts?: { documentId?: string; progressMessage?: string }) => void
  /** Set file to complete state */
  setFileComplete: (fileId: string, documentId?: string) => void
  /** Set file to failed state */
  setFileFailed: (fileId: string, errorMessage: string) => void
  /** Set file to idle state (for retry or cancel) */
  setFileIdle: (fileId: string) => void
  /** Update file progress (0-100) with optional message */
  setFileProgress: (fileId: string, progress: number, progressMessage?: string) => void
  /** Register XHR for a file (for cancellation) */
  registerXhr: (fileId: string, xhr: XMLHttpRequest) => void
  /** Abort XHR for a file */
  abortXhr: (fileId: string) => boolean
  /** Get XHR for a file */
  getXhr: (fileId: string) => XMLHttpRequest | undefined
}

/**
 * Hook for managing file upload state with XHR tracking and deduplication.
 */
export function useFileUploadState(
  options: UseFileUploadStateOptions = {}
): UseFileUploadStateReturn {
  const { defaultDocType = 'auto' } = options

  const [files, setFiles] = useState<UploadedFile[]>([])
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map())

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort all active XHRs
      xhrMapRef.current.forEach((xhr) => xhr.abort())
      xhrMapRef.current.clear()
      // Clear files to release File objects
      setFiles([])
    }
  }, [])

  // Calculate stats from files
  const stats = getFileStats(files)

  // Add new files with validation and deduplication
  const addFiles = useCallback(
    (fileList: FileList): FileValidationResult => {
      const valid: UploadedFile[] = []
      const rejected: { name: string; reason: string }[] = []

      // Build a Set of existing files for deduplication (name + size)
      const existingFileKeys = new Set<string>()
      setFiles((prev) => {
        prev.forEach((f) => existingFileKeys.add(`${f.name}:${f.size}`))
        return prev // Don't modify state, just read it
      })

      Array.from(fileList).forEach((file) => {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          rejected.push({
            name: file.name,
            reason: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          })
          return
        }

        // Validate file extension
        const extension = file.name.split('.').pop()?.toLowerCase() || ''
        if (!ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
          rejected.push({
            name: file.name,
            reason: `Invalid file type (.${extension})`,
          })
          return
        }

        // Validate MIME type (defense in depth)
        if (!ALLOWED_CONTENT_TYPES.includes(file.type as typeof ALLOWED_CONTENT_TYPES[number]) && file.type !== '') {
          rejected.push({
            name: file.name,
            reason: `Invalid content type (${file.type})`,
          })
          return
        }

        // Sanitize filename
        const sanitizedName = sanitizeFilename(file.name)

        // Deduplication: check if a file with same name and size already exists
        const fileKey = `${sanitizedName}:${file.size}`
        if (existingFileKeys.has(fileKey)) {
          rejected.push({
            name: file.name,
            reason: 'Duplicate file (same name and size already added)',
          })
          return
        }

        // Also check within the current batch
        const batchKey = `${sanitizedName}:${file.size}`
        if (valid.some((v) => `${v.name}:${v.size}` === batchKey)) {
          rejected.push({
            name: file.name,
            reason: 'Duplicate file in this batch',
          })
          return
        }

        existingFileKeys.add(fileKey)

        valid.push({
          id: crypto.randomUUID(),
          name: sanitizedName,
          size: file.size,
          type: defaultDocType === 'auto' ? detectDocumentType(sanitizedName) : defaultDocType,
          status: FILE_STATUS.IDLE as FileStatus,
          progress: 0,
          file,
        })
      })

      if (valid.length > 0) {
        setFiles((prev) => [...prev, ...valid])
      }

      return { valid, rejected }
    },
    [defaultDocType]
  )

  // Update a single file by ID
  const updateFile = useCallback((fileId: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    )
  }, [])

  // Update a file by documentId (for extraction callbacks that only know the documentId)
  const updateFileByDocumentId = useCallback((documentId: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.documentId === documentId ? { ...f, ...updates } : f))
    )
  }, [])

  // Remove a file (with XHR abort)
  const removeFile = useCallback((fileId: string) => {
    const xhr = xhrMapRef.current.get(fileId)
    if (xhr) {
      xhr.abort()
      xhrMapRef.current.delete(fileId)
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  // Clear all files
  const clearFiles = useCallback(() => {
    xhrMapRef.current.forEach((xhr) => xhr.abort())
    xhrMapRef.current.clear()
    setFiles([])
  }, [])

  // Status update helpers
  const setFileUploading = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: FILE_STATUS.UPLOADING as FileStatus, progress: 0, progressMessage: undefined }
          : f
      )
    )
  }, [])

  const setFileProcessing = useCallback((fileId: string, opts?: { documentId?: string; progressMessage?: string }) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: FILE_STATUS.PROCESSING as FileStatus,
              ...(opts?.documentId && { documentId: opts.documentId }),
              ...(opts?.progressMessage !== undefined && { progressMessage: opts.progressMessage }),
              // Clear File object to release memory once processing starts
              file: undefined,
            }
          : f
      )
    )
  }, [])

  const setFileComplete = useCallback((fileId: string, documentId?: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: FILE_STATUS.COMPLETE as FileStatus,
              ...(documentId && { documentId }),
              progressMessage: undefined,
              // Clear File object to release memory
              file: undefined,
            }
          : f
      )
    )
  }, [])

  const setFileFailed = useCallback((fileId: string, errorMessage: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: FILE_STATUS.FAILED as FileStatus, errorMessage, progressMessage: undefined }
          : f
      )
    )
  }, [])

  const setFileIdle = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: FILE_STATUS.IDLE as FileStatus,
              progress: 0,
              errorMessage: undefined,
              progressMessage: undefined,
            }
          : f
      )
    )
  }, [])

  const setFileProgress = useCallback((fileId: string, progress: number, progressMessage?: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, progress, ...(progressMessage !== undefined && { progressMessage }) }
          : f
      )
    )
  }, [])

  // XHR management
  const registerXhr = useCallback((fileId: string, xhr: XMLHttpRequest) => {
    xhrMapRef.current.set(fileId, xhr)
  }, [])

  const abortXhr = useCallback((fileId: string): boolean => {
    const xhr = xhrMapRef.current.get(fileId)
    if (xhr) {
      xhr.abort()
      xhrMapRef.current.delete(fileId)
      return true
    }
    return false
  }, [])

  const getXhr = useCallback((fileId: string): XMLHttpRequest | undefined => {
    return xhrMapRef.current.get(fileId)
  }, [])

  return {
    files,
    stats,
    addFiles,
    updateFile,
    updateFileByDocumentId,
    removeFile,
    clearFiles,
    setFileUploading,
    setFileProcessing,
    setFileComplete,
    setFileFailed,
    setFileIdle,
    setFileProgress,
    registerXhr,
    abortXhr,
    getXhr,
  }
}
