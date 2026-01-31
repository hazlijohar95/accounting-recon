'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal content */
  children: React.ReactNode
  /** Custom class name for modal container */
  className?: string
  /** Whether to show close button */
  showCloseButton?: boolean
  /** Whether clicking outside closes the modal */
  closeOnOutsideClick?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Footer content */
  footer?: React.ReactNode
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

/**
 * Accessible Modal Component
 *
 * Features:
 * - Focus trap (cycles focus within modal)
 * - Escape key to close
 * - Click outside to close (configurable)
 * - ARIA attributes for screen readers
 * - Prevents body scroll when open
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  size = 'md',
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const hasStoredFocus = useRef(false)

  // Capture focused element on mount (handles isOpen={true} on initial render)
  useEffect(() => {
    // Only capture on mount if we haven't already stored focus
    if (!hasStoredFocus.current && isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      hasStoredFocus.current = true
    }
  }, []) // Empty deps - only run on mount

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Focus management and body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element (if not already stored)
      if (!hasStoredFocus.current) {
        previousActiveElement.current = document.activeElement as HTMLElement
        hasStoredFocus.current = true
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      // Focus the modal
      modalRef.current?.focus()
    } else {
      // Restore body scroll
      document.body.style.overflow = ''

      // Restore focus to previous element and reset stored state
      if (hasStoredFocus.current) {
        previousActiveElement.current?.focus()
        hasStoredFocus.current = false
        previousActiveElement.current = null
      }
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus trap - cycle focus within modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab on first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // Tab on last element -> go to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    },
    []
  )

  // Handle outside click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOutsideClick && e.target === e.currentTarget) {
        onClose()
      }
    },
    [closeOnOutsideClick, onClose]
  )

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-background border border-border shadow-xl w-full mx-4 animate-scale-in focus:outline-none',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            {title && (
              <h2 id="modal-title" className="text-lg font-medium">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-ring"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
