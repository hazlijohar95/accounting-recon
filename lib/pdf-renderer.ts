/**
 * PDF Renderer Module
 *
 * Browser-side PDF to image conversion using PDF.js.
 * Replaces Cloudinary dependency with native rendering.
 *
 * IMPORTANT: This module uses dynamic imports to ensure PDF.js is only
 * loaded on the client side. PDF.js uses browser-only APIs like DOMMatrix
 * that cause SSR errors if imported at module load time.
 *
 * @module lib/pdf-renderer
 */

// Lazy-load pdfjs to avoid SSR issues with DOMMatrix
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function getPdfjs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF rendering is only available in the browser')
  }

  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Configure PDF.js worker - use local file for security
      // The worker handles the heavy PDF parsing in a separate thread
      // SECURITY: Using local worker instead of CDN to prevent MITM attacks and ensure integrity
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return pdfjs
    })
  }

  return pdfjsPromise
}

/**
 * Result of rendering a single PDF page
 */
export interface PageRenderResult {
  /** 1-indexed page number */
  pageNumber: number
  /** Rendered page as image blob */
  blob: Blob
  /** Width of rendered image in pixels */
  width: number
  /** Height of rendered image in pixels */
  height: number
}

/**
 * Progress callback for render operations
 */
export interface RenderProgress {
  /** Current page being processed (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Current phase of rendering */
  phase: 'loading' | 'rendering' | 'complete'
  /** Human-readable progress message */
  message: string
}

/**
 * Options for PDF rendering
 */
export interface RenderOptions {
  /**
   * Scale factor for rendering (default: 2.0 for good OCR quality)
   * Higher values = better quality but larger file sizes
   * - 1.0 = 72 DPI (screen)
   * - 2.0 = 144 DPI (recommended for OCR)
   * - 3.0 = 216 DPI (high quality)
   */
  scale?: number
  /**
   * Output image format (default: 'png' for best quality)
   * - 'png' = lossless, best for OCR
   * - 'jpeg' = smaller files, may lose detail
   */
  format?: 'png' | 'jpeg'
  /**
   * JPEG quality (0-1, default: 0.92)
   * Only applies when format is 'jpeg'
   */
  quality?: number
  /**
   * Progress callback for UI updates
   */
  onProgress?: (progress: RenderProgress) => void
}

/**
 * Get page count from a PDF file without rendering
 *
 * @param file - PDF file to analyze
 * @returns Number of pages in the PDF
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pageCount = pdf.numPages
  await pdf.destroy()
  return pageCount
}

/**
 * Render all pages of a PDF to images
 *
 * Uses an async generator to yield pages one-by-one, allowing
 * the caller to process/upload each page as it completes rather
 * than waiting for all pages to render.
 *
 * @param file - PDF file to render
 * @param options - Rendering options
 * @yields PageRenderResult for each page
 *
 * @example
 * ```typescript
 * for await (const page of renderPdfPages(file, { scale: 2.0 })) {
 *   console.log(`Rendered page ${page.pageNumber}`)
 *   await uploadPage(page.blob)
 * }
 * ```
 */
export async function* renderPdfPages(
  file: File,
  options: RenderOptions = {}
): AsyncGenerator<PageRenderResult, void, void> {
  const {
    scale = 2.0,
    format = 'png',
    quality = 0.92,
    onProgress,
  } = options

  // Load PDF document
  onProgress?.({
    currentPage: 0,
    totalPages: 0,
    phase: 'loading',
    message: 'Loading PDF document...',
  })

  const pdfjs = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages

  onProgress?.({
    currentPage: 0,
    totalPages,
    phase: 'loading',
    message: `PDF loaded: ${totalPages} pages`,
  })

  try {
    // Render each page sequentially
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({
        currentPage: pageNum,
        totalPages,
        phase: 'rendering',
        message: `Rendering page ${pageNum} of ${totalPages}...`,
      })

      const page = await pdf.getPage(pageNum)

      // Get viewport at desired scale
      const viewport = page.getViewport({ scale })

      // Create canvas for rendering
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Failed to get canvas 2D context')
      }

      canvas.width = viewport.width
      canvas.height = viewport.height

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) {
              resolve(b)
            } else {
              reject(new Error(`Failed to convert page ${pageNum} to blob`))
            }
          },
          `image/${format}`,
          format === 'jpeg' ? quality : undefined
        )
      })

      yield {
        pageNumber: pageNum,
        blob,
        width: viewport.width,
        height: viewport.height,
      }
    }

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      phase: 'complete',
      message: 'All pages rendered',
    })
  } finally {
    // Clean up PDF document
    await pdf.destroy()
  }
}

/**
 * Render a specific page of a PDF to an image
 *
 * Useful when you need to re-render a specific page without
 * processing the entire document.
 *
 * @param file - PDF file to render
 * @param pageNumber - Page number to render (1-indexed)
 * @param options - Rendering options
 * @returns Rendered page result
 */
export async function renderSinglePage(
  file: File,
  pageNumber: number,
  options: RenderOptions = {}
): Promise<PageRenderResult> {
  const {
    scale = 2.0,
    format = 'png',
    quality = 0.92,
  } = options

  const pdfjs = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  try {
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Page ${pageNumber} out of range (1-${pdf.numPages})`)
    }

    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Failed to get canvas 2D context')
    }

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b)
          } else {
            reject(new Error('Failed to convert page to blob'))
          }
        },
        `image/${format}`,
        format === 'jpeg' ? quality : undefined
      )
    })

    return {
      pageNumber,
      blob,
      width: viewport.width,
      height: viewport.height,
    }
  } finally {
    await pdf.destroy()
  }
}

/**
 * Check if a file is a PDF
 *
 * @param file - File to check
 * @returns True if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
  // Check by MIME type
  if (file.type === 'application/pdf') {
    return true
  }

  // Fallback to extension check
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension === 'pdf'
}

/**
 * Estimate file size for rendered pages
 *
 * Provides a rough estimate based on page count and scale.
 * Useful for showing upload estimates to users.
 *
 * @param pageCount - Number of pages
 * @param scale - Render scale (default: 2.0)
 * @param format - Image format (default: 'png')
 * @returns Estimated total size in bytes
 */
export function estimateRenderSize(
  pageCount: number,
  scale: number = 2.0,
  format: 'png' | 'jpeg' = 'png'
): number {
  // Average estimates based on typical A4 document
  // PNG: ~500KB per page at 2x scale
  // JPEG: ~150KB per page at 2x scale
  const baseSize = format === 'png' ? 500_000 : 150_000
  const scaleMultiplier = (scale / 2.0) ** 2 // Size scales with area

  return Math.round(pageCount * baseSize * scaleMultiplier)
}
