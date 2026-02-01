'use client'

/**
 * Onboarding Checklist Component
 *
 * A collapsible checklist that guides new users through the
 * essential steps to get started with Reconciled.
 */

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  IconCheckCircle,
  IconCaretDown,
  IconCaretUp,
  IconX,
  IconUpload,
  IconBuildings,
  IconFileText,
  IconPlay,
  IconDownload,
  IconSparkle,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { useOnboardingState } from './use-onboarding-state'
import { useAuth } from '@/components/auth-provider'
import { useSelectedCompanyId, useCompanies } from '@/lib/store'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  href?: string
  checkComplete: () => boolean
}

/**
 * Onboarding checklist component.
 * Shows a getting-started checklist that tracks user progress.
 */
export function OnboardingChecklist() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const selectedCompanyId = useSelectedCompanyId()
  const companies = useCompanies()
  const {
    checklistVisible,
    toggleChecklist,
    completedItems,
    completeItem,
    tourSeen,
    startTour,
  } = useOnboardingState()

  // Define checklist items with completion checks
  const checklistItems: ChecklistItem[] = [
    {
      id: 'company',
      label: 'Create a company',
      description: 'Set up your first company profile',
      icon: <IconBuildings size={16} />,
      href: '/dashboard',
      checkComplete: () => companies.length > 0,
    },
    {
      id: 'upload',
      label: 'Upload documents',
      description: 'Upload bank statements or invoices',
      icon: <IconUpload size={16} />,
      href: '/upload',
      checkComplete: () => completedItems.includes('upload'),
    },
    {
      id: 'match',
      label: 'Run matching',
      description: 'Let AI match your transactions',
      icon: <IconPlay size={16} />,
      href: '/reconcile',
      checkComplete: () => completedItems.includes('match'),
    },
    {
      id: 'review',
      label: 'Review a match',
      description: 'Approve or reject a suggested match',
      icon: <IconFileText size={16} />,
      href: '/reconcile',
      checkComplete: () => completedItems.includes('review'),
    },
    {
      id: 'export',
      label: 'Export a report',
      description: 'Download your reconciliation report',
      icon: <IconDownload size={16} />,
      href: '/reports',
      checkComplete: () => completedItems.includes('export'),
    },
  ]

  // Calculate progress
  const completedCount = checklistItems.filter(item => item.checkComplete()).length
  const totalCount = checklistItems.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)
  const isAllComplete = completedCount === totalCount

  // Don't show if not authenticated or all complete
  if (!isAuthenticated || isAllComplete) return null

  const handleItemClick = (item: ChecklistItem) => {
    if (item.href) {
      router.push(item.href)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border border-border shadow-xl animate-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <button
        onClick={toggleChecklist}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <IconSparkle size={20} className="text-foreground" />
            {!tourSeen && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Getting Started</p>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress ring */}
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              className="stroke-muted"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              className="stroke-foreground transition-all duration-500"
              strokeWidth="3"
              strokeDasharray={`${progressPercent} 100`}
              strokeLinecap="round"
            />
          </svg>
          {checklistVisible ? (
            <IconCaretDown size={16} className="text-muted-foreground" />
          ) : (
            <IconCaretUp size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {checklistVisible && (
        <div className="divide-y divide-border">
          {/* Take tour button */}
          {!tourSeen && (
            <button
              onClick={startTour}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors group"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                <IconSparkle size={14} className="text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-blue-500 group-hover:text-blue-400">
                  Take a quick tour
                </p>
                <p className="text-xs text-muted-foreground">Learn how Reconciled works</p>
              </div>
            </button>
          )}

          {/* Checklist items */}
          {checklistItems.map((item) => {
            const isComplete = item.checkComplete()
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={isComplete}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                  isComplete
                    ? 'opacity-60 cursor-default'
                    : 'hover:bg-secondary/30 cursor-pointer'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                  isComplete ? 'bg-success/10' : 'bg-secondary'
                )}>
                  {isComplete ? (
                    <IconCheckCircle size={16} className="text-success" />
                  ) : (
                    <span className="text-muted-foreground">{item.icon}</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={cn(
                    'text-sm',
                    isComplete && 'line-through text-muted-foreground'
                  )}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
