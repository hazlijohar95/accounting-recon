/**
 * Upload handlers module
 * Extracts complex upload logic from upload-view.tsx
 */

import { Id } from '@/convex/_generated/dataModel'
import {
  UPLOAD_CONFIG,
  ERROR_MESSAGES,
  mapErrorMessage,
} from './constants/upload'
import type { UploadedFile } from './fileUtils'

export interface UploadContext {
  /** File to upload */
  file: UploadedFile
  /** Selected company ID */
  companyId: Id<"companies">
  /** Whether in demo mode */
  isDemo: boolean
}

export interface UploadCallbacks {
  /** Update file status to uploading */
  onUploading: () => void
  /** Update file progress */
  onProgress: (progress: number) => void
  /** Update file status to processing */
  onProcessing: (documentId?: Id<"documents">) => void
  /** Update file status to complete */
  onComplete: (documentId: Id<"documents">) => void
  /** Update file status to failed */
  onFailed: (errorMessage: string) => void
  /** Reset file to idle (for demo mode) */
  onReset: () => void
  /** Register XHR for cancellation */
  onRegisterXhr: (xhr: XMLHttpRequest) => void
  /** Show toast notification */
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void
  /** Show paywall (demo mode) */
  onShowPaywall: () => void
}

export interface UploadServices {
  /** Generate upload URL from Convex */
  generateUploadUrl: (args: { companyId: Id<"companies"> }) => Promise<string>
  /** Create document record in Convex */
  createDocument: (args: {
    companyId: Id<"companies">
    fileName: string
    fileType: string
    fileSize: number
    contentType: string
    storageId: Id<"_storage">
    documentType: string
  }) => Promise<Id<"documents">>
  /** Trigger extraction for document */
  triggerExtraction: (documentId: Id<"documents">) => Promise<void>
  /** Extract PDF using native extraction */
  extractPdf: (
    file: File,
    companyId: Id<"companies">,
    documentType: string
  ) => Promise<Id<"documents"> | null>
  /** Check if file is a PDF */
  isPdfFile: (file: File) => boolean
}

/**
 * Handle demo mode upload simulation
 */
export async function handleDemoUpload(
  callbacks: Pick<UploadCallbacks, 'onUploading' | 'onProgress' | 'onReset' | 'onShowPaywall' | 'onToast'>
): Promise<void> {
  callbacks.onUploading()

  // Simulate upload progress
  for (let i = 0; i <= 100; i += UPLOAD_CONFIG.DEMO_PROGRESS_INCREMENT) {
    await new Promise((r) => setTimeout(r, UPLOAD_CONFIG.DEMO_PROGRESS_DELAY_MS))
    callbacks.onProgress(i)
  }

  // Reset file and show paywall
  callbacks.onReset()
  callbacks.onShowPaywall()
  callbacks.onToast(
    'info',
    'Sign up to process documents',
    'Create an account to extract and reconcile your data'
  )
}

/**
 * Handle PDF file upload using native extraction
 */
export async function handlePdfUpload(
  context: UploadContext,
  callbacks: Pick<UploadCallbacks, 'onProcessing' | 'onComplete' | 'onFailed'>,
  services: Pick<UploadServices, 'extractPdf'>
): Promise<void> {
  if (!context.file.file) {
    callbacks.onFailed('No file data')
    return
  }

  callbacks.onProcessing()

  const documentId = await services.extractPdf(
    context.file.file,
    context.companyId,
    context.file.type
  )

  if (documentId) {
    callbacks.onComplete(documentId)
  } else {
    callbacks.onFailed('Extraction failed')
  }
}

/**
 * Handle standard file upload (images, CSV, Excel)
 */
export async function handleStandardUpload(
  context: UploadContext,
  callbacks: Pick<
    UploadCallbacks,
    'onUploading' | 'onProgress' | 'onProcessing' | 'onComplete' | 'onFailed' | 'onRegisterXhr' | 'onToast'
  >,
  services: Pick<UploadServices, 'generateUploadUrl' | 'createDocument' | 'triggerExtraction'>
): Promise<void> {
  if (!context.file.file) {
    callbacks.onFailed('No file data')
    return
  }

  callbacks.onUploading()

  try {
    // Step 1: Get upload URL from Convex
    const uploadUrl = await services.generateUploadUrl({
      companyId: context.companyId,
    })

    // Step 2: Upload file with XHR for progress tracking
    const storageId = await uploadFileWithProgress(
      context.file.file,
      uploadUrl,
      callbacks
    )

    // Step 3: Get file extension
    const fileExtension = context.file.name.split('.').pop()?.toLowerCase() || ''

    // Step 4: Create document record in Convex
    const documentId = await services.createDocument({
      companyId: context.companyId,
      fileName: context.file.name,
      fileType: fileExtension,
      fileSize: context.file.size,
      contentType: context.file.file.type,
      storageId,
      documentType: context.file.type,
    })

    // Step 5: Update to processing state
    callbacks.onProcessing(documentId)

    // Step 6: Trigger extraction
    await services.triggerExtraction(documentId)

    callbacks.onToast(
      'success',
      'Upload complete',
      `${context.file.name} is being processed`
    )
  } catch (error) {
    handleUploadError(error, callbacks.onFailed, callbacks.onToast)
  }
}

/**
 * Upload file with XHR progress tracking
 */
async function uploadFileWithProgress(
  file: File,
  uploadUrl: string,
  callbacks: Pick<UploadCallbacks, 'onProgress' | 'onRegisterXhr'>
): Promise<Id<"_storage">> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Set timeout
    xhr.timeout = UPLOAD_CONFIG.XHR_TIMEOUT_MS

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100)
        callbacks.onProgress(percentComplete)
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

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out after 5 minutes'))
    })

    // Register XHR for potential cancellation
    callbacks.onRegisterXhr(xhr)

    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Handle upload errors with user-friendly messages
 */
export function handleUploadError(
  error: unknown,
  onFailed: (errorMessage: string) => void,
  onToast: (type: 'error', title: string, description: string) => void
): void {
  console.error('Upload error:', error)

  const rawMessage = error instanceof Error ? error.message : 'Upload failed'
  const { title, description } = mapErrorMessage(rawMessage)

  onFailed(description)
  onToast('error', title, description)
}

/**
 * Validate upload prerequisites
 */
export function validateUploadPrerequisites(
  context: Partial<UploadContext>,
  callbacks: Pick<UploadCallbacks, 'onFailed' | 'onToast'>
): context is UploadContext {
  if (!context.companyId) {
    callbacks.onFailed(ERROR_MESSAGES.NO_COMPANY_SELECTED.description)
    callbacks.onToast(
      'error',
      ERROR_MESSAGES.NO_COMPANY_SELECTED.title,
      ERROR_MESSAGES.NO_COMPANY_SELECTED.description
    )
    return false
  }

  if (!context.file?.file) {
    callbacks.onFailed('No file data')
    return false
  }

  return true
}
