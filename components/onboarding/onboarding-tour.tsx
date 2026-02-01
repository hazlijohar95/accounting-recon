'use client'

/**
 * Onboarding Tour Component
 *
 * A guided tour overlay that highlights key features and explains
 * the reconciliation workflow to new users.
 *
 * Features:
 * - Step-by-step tooltips
 * - Spotlight highlighting
 * - Keyboard navigation
 * - Progress indicator
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconCaretLeft, IconCaretRight, IconUpload, IconFileText, IconDownload, IconCheckCircle } from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { useOnboardingState } from './use-onboarding-state'

interface TourStep {
  id: string
  title: string
  description: string
  target: string // CSS selector for the target element
  placement: 'top' | 'bottom' | 'left' | 'right'
  icon?: React.ReactNode
  action?: {
    label: string
    href: string
  }
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Reconciled',
    description: 'Let us show you how to reconcile your bank statements with invoices using AI-powered matching.',
    target: 'body',
    placement: 'bottom',
    icon: <IconCheckCircle size={24} className="text-success" />,
  },
  {
    id: 'upload',
    title: '1. Upload Documents',
    description: 'Start by uploading your bank statements and invoices. We support PDF, CSV, and Excel files.',
    target: '[href="/upload"]',
    placement: 'right',
    icon: <IconUpload size={24} className="text-blue-500" />,
    action: {
      label: 'Go to Upload',
      href: '/upload',
    },
  },
  {
    id: 'reconcile',
    title: '2. Review Matches',
    description: 'Our 5-layer AI matching engine finds matches automatically. Review and approve them here.',
    target: '[href="/reconcile"]',
    placement: 'right',
    icon: <IconFileText size={24} className="text-purple-500" />,
  },
  {
    id: 'reports',
    title: '3. Export Reports',
    description: 'Generate bank reconciliation reports and export to your accounting software.',
    target: '[href="/reports"]',
    placement: 'right',
    icon: <IconDownload size={24} className="text-green-500" />,
  },
  {
    id: 'done',
    title: "You're Ready!",
    description: "That's all you need to know. Start by uploading your documents and let the AI do the matching.",
    target: 'body',
    placement: 'bottom',
    icon: <IconCheckCircle size={24} className="text-success" />,
  },
]

/**
 * The main onboarding tour overlay component.
 */
export function OnboardingTour() {
  const { tourActive, tourStep, nextStep, prevStep, endTour } = useOnboardingState()
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const currentStep = tourSteps[tourStep]
  const isFirstStep = tourStep === 0
  const isLastStep = tourStep === tourSteps.length - 1

  // Calculate tooltip position based on target element
  useEffect(() => {
    if (!tourActive || !currentStep) return

    const updatePosition = () => {
      const target = currentStep.target === 'body'
        ? null
        : document.querySelector(currentStep.target)

      if (!target) {
        // Center on screen for body target
        setTooltipPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 3,
        })
        setTargetRect(null)
        return
      }

      const rect = target.getBoundingClientRect()
      setTargetRect(rect)

      // Calculate position based on placement
      let x = rect.left + rect.width / 2
      let y = rect.top + rect.height / 2

      const offset = 16

      switch (currentStep.placement) {
        case 'top':
          y = rect.top - offset
          break
        case 'bottom':
          y = rect.bottom + offset
          break
        case 'left':
          x = rect.left - offset
          break
        case 'right':
          x = rect.right + offset
          break
      }

      setTooltipPosition({ x, y })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [tourActive, currentStep, tourStep])

  // Keyboard navigation
  useEffect(() => {
    if (!tourActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          endTour()
          break
        case 'ArrowRight':
        case 'Enter':
          if (!isLastStep) nextStep()
          else endTour()
          break
        case 'ArrowLeft':
          if (!isFirstStep) prevStep()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tourActive, isFirstStep, isLastStep, nextStep, prevStep, endTour])

  if (!tourActive || typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={endTour}
      />

      {/* Spotlight highlight */}
      {targetRect && (
        <div
          className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: '8px',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'absolute bg-background border border-border shadow-xl max-w-sm w-full transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200',
          currentStep?.placement === 'top' && '-translate-y-full',
          currentStep?.placement === 'bottom' && 'translate-y-0',
          currentStep?.placement === 'left' && '-translate-x-full translate-y-[-50%]',
          currentStep?.placement === 'right' && 'translate-y-[-50%]',
        )}
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
        }}
      >
        {/* Close button */}
        <button
          onClick={endTour}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close tour"
        >
          <IconX size={16} />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          {currentStep?.icon && (
            <div className="mb-4 flex justify-center">
              {currentStep.icon}
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-medium text-center mb-2">
            {currentStep?.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            {currentStep?.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === tourStep ? 'bg-foreground' : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prevStep}
              disabled={isFirstStep}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                isFirstStep
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <IconCaretLeft size={16} />
              Back
            </button>

            {currentStep?.action ? (
              <a
                href={currentStep.action.href}
                onClick={endTour}
                className="flex-1 text-center px-4 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                {currentStep.action.label}
              </a>
            ) : (
              <button
                onClick={isLastStep ? endTour : nextStep}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <IconCaretRight size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="px-6 pb-4 pt-0">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 bg-muted border border-border text-[10px] font-mono">Enter</kbd> to continue,{' '}
            <kbd className="px-1 py-0.5 bg-muted border border-border text-[10px] font-mono">Esc</kbd> to skip
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
