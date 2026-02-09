'use client'

/**
 * Document Viewer with Source Linking
 *
 * Displays extracted document pages with:
 * - Zoom/pan controls via react-zoom-pan-pinch
 * - Region highlighting for source linking (click field -> see original location)
 * - Side-by-side view: Extracted value | Original image region
 *
 * @module components/document-viewer
 */

import React, { useState, useCallback, useMemo } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { useWorkosUserId } from '@/lib/convex-hooks/shared'
import {
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconX,
  IconExpand,
  IconTarget,
} from '@/components/brand/icons'
import { Modal } from '@/components/ui/modal'
import { LoadingSpinner } from '@/components/brand'

// ============================================================================
// Types
// ============================================================================

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface FieldBoundingBoxes {
  pageNumber: number
  date?: BoundingBox
  description?: BoundingBox
  amount?: BoundingBox
  reference?: BoundingBox
}

interface HighlightedField {
  fieldName: string
  boundingBox: BoundingBox
  value: string
  confidence?: number
}

interface DocumentViewerProps {
  /** Document ID to display */
  documentId: Id<"documents">
  /** Page number to display (1-indexed) */
  pageNumber?: number
  /** Optional highlighted field */
  highlight?: HighlightedField
  /** Whether to show controls */
  showControls?: boolean
  /** Additional class name */
  className?: string
}

interface SourceLinkModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: Id<"documents">
  pageNumber: number
  field: HighlightedField
}

// ============================================================================
// Document Viewer Component
// ============================================================================

/**
 * Document Viewer with zoom/pan and region highlighting
 */
export function DocumentViewer({
  documentId,
  pageNumber = 1,
  highlight,
  showControls = true,
  className,
}: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const workosUserId = useWorkosUserId()

  // Get document to retrieve Cloudinary public ID
  const document = useQuery(api.documents.get, { id: documentId, workosUserId })

  // Construct Cloudinary URL for the specific page
  const imageUrl = useMemo(() => {
    if (!document?.storageId) return null

    // For now, we'll use Convex storage URL
    // In production, this would be the Cloudinary URL for the specific page
    // Example: https://res.cloudinary.com/{cloud}/image/upload/pg_{page}/{publicId}
    return null // Will be implemented when we store Cloudinary public ID
  }, [document])

  if (!document) {
    return (
      <div className="flex items-center justify-center h-64 bg-secondary/20">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  // Placeholder while we implement Cloudinary URL generation
  if (!imageUrl) {
    return (
      <div className={cn("relative bg-secondary/20", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <IconExpand size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Document preview</p>
            <p className="text-xs mt-1">Page {pageNumber}</p>
          </div>
        </div>

        {/* Highlight overlay placeholder */}
        {highlight && (
          <div className="absolute inset-0 pointer-events-none">
            <HighlightOverlay
              boundingBox={highlight.boundingBox}
              label={highlight.fieldName}
              confidence={highlight.confidence}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controls */}
            {showControls && (
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <ViewerButton
                  onClick={() => zoomIn()}
                  icon={<IconZoomIn size={16} />}
                  label="Zoom in"
                />
                <ViewerButton
                  onClick={() => zoomOut()}
                  icon={<IconZoomOut size={16} />}
                  label="Zoom out"
                />
                <ViewerButton
                  onClick={() => resetTransform()}
                  icon={<IconRefresh size={16} />}
                  label="Reset zoom"
                />
                <ViewerButton
                  onClick={() => setIsFullscreen(true)}
                  icon={<IconExpand size={16} />}
                  label="Fullscreen"
                />
              </div>
            )}

            {/* Image container */}
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
            >
              <div className="relative">
                <img
                  src={imageUrl}
                  alt={`Page ${pageNumber} of ${document.fileName}`}
                  className="max-w-full h-auto"
                />

                {/* Highlight overlay */}
                {highlight && (
                  <HighlightOverlay
                    boundingBox={highlight.boundingBox}
                    label={highlight.fieldName}
                    confidence={highlight.confidence}
                  />
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <FullscreenViewer
          imageUrl={imageUrl}
          fileName={document.fileName}
          pageNumber={pageNumber}
          highlight={highlight}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Source Link Modal
// ============================================================================

/**
 * Modal showing side-by-side comparison: extracted value vs original location
 */
export function SourceLinkModal({
  isOpen,
  onClose,
  documentId,
  pageNumber,
  field,
}: SourceLinkModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Source Verification"
      size="lg"
    >
      <div className="space-y-4">
        {/* Header with field info */}
        <div className="flex items-center justify-between p-3 bg-secondary/30">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {field.fieldName}
            </span>
            <div className="text-lg font-medium mt-1">{field.value}</div>
          </div>
          {field.confidence !== undefined && (
            <ConfidenceBadge confidence={field.confidence} />
          )}
        </div>

        {/* Document viewer with highlight */}
        <div className="border border-border">
          <DocumentViewer
            documentId={documentId}
            pageNumber={pageNumber}
            highlight={field}
            showControls={true}
            className="h-96"
          />
        </div>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          The highlighted region shows where this value was extracted from the original document.
          Use zoom/pan to examine the source text.
        </p>
      </div>
    </Modal>
  )
}

// ============================================================================
// Source Link Button
// ============================================================================

interface SourceLinkButtonProps {
  documentId: Id<"documents">
  pageNumber: number
  fieldName: string
  value: string
  boundingBox?: BoundingBox
  confidence?: number
}

/**
 * Button that opens source verification modal
 */
export function SourceLinkButton({
  documentId,
  pageNumber,
  fieldName,
  value,
  boundingBox,
  confidence,
}: SourceLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Only show if we have bounding box data
  if (!boundingBox) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5",
          "text-xs text-muted-foreground",
          "hover:text-foreground hover:bg-secondary/50",
          "transition-colors rounded"
        )}
        title="View original source location"
      >
        <IconTarget size={12} />
        <span className="sr-only">View source</span>
      </button>

      <SourceLinkModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        documentId={documentId}
        pageNumber={pageNumber}
        field={{
          fieldName,
          value,
          boundingBox,
          confidence,
        }}
      />
    </>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Viewer control button
 */
function ViewerButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1.5 bg-background/80 border border-border",
        "hover:bg-secondary transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

/**
 * Highlight overlay for bounding boxes
 */
function HighlightOverlay({
  boundingBox,
  label,
  confidence,
}: {
  boundingBox: BoundingBox
  label: string
  confidence?: number
}) {
  // Determine color based on confidence
  const getColor = () => {
    if (confidence === undefined) return 'border-info bg-info/10'
    if (confidence >= 90) return 'border-success bg-success/10'
    if (confidence >= 70) return 'border-warning bg-warning/10'
    return 'border-error bg-error/10'
  }

  return (
    <div
      className={cn(
        "absolute border-2 pointer-events-none",
        "animate-pulse",
        getColor()
      )}
      style={{
        left: `${boundingBox.x}%`,
        top: `${boundingBox.y}%`,
        width: `${boundingBox.width}%`,
        height: `${boundingBox.height}%`,
      }}
    >
      {/* Label */}
      <div
        className={cn(
          "absolute -top-5 left-0",
          "px-1 py-0.5 text-[10px] font-medium",
          "bg-background border border-border"
        )}
      >
        {label}
        {confidence !== undefined && (
          <span className="ml-1 opacity-70">{confidence}%</span>
        )}
      </div>
    </div>
  )
}

/**
 * Confidence badge component
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getStyle = () => {
    if (confidence >= 90) return 'bg-success/10 text-success border-success/20'
    if (confidence >= 70) return 'bg-warning/10 text-warning border-warning/20'
    return 'bg-error/10 text-error border-error/20'
  }

  const getLabel = () => {
    if (confidence >= 90) return 'High'
    if (confidence >= 70) return 'Medium'
    return 'Low'
  }

  return (
    <div className={cn("px-2 py-1 text-xs font-medium border", getStyle())}>
      {getLabel()} ({confidence}%)
    </div>
  )
}

/**
 * Fullscreen viewer modal
 */
function FullscreenViewer({
  imageUrl,
  fileName,
  pageNumber,
  highlight,
  onClose,
}: {
  imageUrl: string
  fileName: string
  pageNumber: number
  highlight?: HighlightedField
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-background/80 border-b border-border">
        <div>
          <h2 className="font-medium">{fileName}</h2>
          <p className="text-sm text-muted-foreground">Page {pageNumber}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-secondary transition-colors"
          aria-label="Close fullscreen"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Viewer */}
      <div className="absolute inset-0 top-16 overflow-hidden">
        <TransformWrapper
          initialScale={1}
          minScale={0.25}
          maxScale={8}
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 p-2 bg-background/80 border border-border">
                <ViewerButton
                  onClick={() => zoomOut()}
                  icon={<IconZoomOut size={18} />}
                  label="Zoom out"
                />
                <ViewerButton
                  onClick={() => resetTransform()}
                  icon={<IconRefresh size={18} />}
                  label="Reset"
                />
                <ViewerButton
                  onClick={() => zoomIn()}
                  icon={<IconZoomIn size={18} />}
                  label="Zoom in"
                />
              </div>

              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                }}
              >
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt={`Page ${pageNumber} of ${fileName}`}
                    className="max-h-[calc(100vh-8rem)] w-auto"
                  />

                  {highlight && (
                    <HighlightOverlay
                      boundingBox={highlight.boundingBox}
                      label={highlight.fieldName}
                      confidence={highlight.confidence}
                    />
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export type {
  BoundingBox,
  FieldBoundingBoxes,
  HighlightedField,
  DocumentViewerProps,
  SourceLinkButtonProps,
}
