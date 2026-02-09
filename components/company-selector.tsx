'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuth } from './auth-provider'
import { useCompanyState, useIsDemo } from '@/lib/store'
import { IconBuildings, IconCaretDown, IconPlus, IconCheck } from '@/components/brand/icons'
import { logManualError } from '@/lib/error-monitor'
import { cn } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'

interface CompanySelectorProps {
  onCreateNew?: () => void
  className?: string
}

/**
 * Company selector dropdown for switching between user's companies.
 * Only shown when user is authenticated and has companies.
 */
export function CompanySelector({ onCreateNew, className }: CompanySelectorProps) {
  const { user } = useAuth()
  const isDemo = useIsDemo()
  const { selectedCompanyId, setSelectedCompanyId, companies, setCompanies } = useCompanyState()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Fetch companies from Convex - pass workosUserId for auth fallback
  // Use workosId if available, otherwise fall back to user.id
  const workosIdForQuery = user?.workosId ?? user?.id
  const convexCompanies = useQuery(
    api.companies.listByOwner,
    user && !isDemo && workosIdForQuery ? { workosUserId: workosIdForQuery } : 'skip'
  )

  // Log query parameters for debugging
  React.useEffect(() => {
    if (user && !isDemo) {
      console.log('[CompanySelector] Query params:', {
        workosUserId: workosIdForQuery,
        hasUser: Boolean(user),
        isDemo,
        querySkipped: !workosIdForQuery,
      })
    }
  }, [user, isDemo, workosIdForQuery])

  // Sync companies to store
  React.useEffect(() => {
    if (convexCompanies === undefined) {
      console.log('[CompanySelector] Query loading...')
      return
    }

    // convexCompanies is now guaranteed to be an array (possibly empty)
    if (convexCompanies.length === 0) {
      console.log('[CompanySelector] Query returned empty array - no companies found for workosUserId:', workosIdForQuery)
      setCompanies([])
      return
    }

    console.log('[CompanySelector] Received companies from Convex:', {
      count: convexCompanies.length,
      companies: convexCompanies.map((c) => ({
        id: c._id,
        name: c.name,
        ownerId: c.ownerId,
      })),
    })

    const mapped = convexCompanies.map((c) => ({
      id: c._id,
      name: c.name,
      code: c.code,
    }))

    // Batch state updates: set companies and auto-select in one pass
    // This prevents any intermediate render where companies exist but none is selected
    setCompanies(mapped)
    if (!selectedCompanyId && mapped.length > 0) {
      setSelectedCompanyId(mapped[0].id)
    }
  }, [convexCompanies, selectedCompanyId, setSelectedCompanyId, setCompanies, workosIdForQuery])

  // Log state changes and detect visibility issues
  React.useEffect(() => {
    console.log('[CompanySelector] State:', {
      userId: user?.id,
      workosId: user?.workosId,
      isDemo,
      selectedCompanyId,
      companiesInStore: companies.length,
      convexQueryResult: convexCompanies === undefined ? 'loading' : convexCompanies?.length ?? 0,
    })

    // TRACKING: Detect when selectedCompanyId exists but company isn't in list
    // This indicates the visibility bug we fixed
    if (
      selectedCompanyId &&
      convexCompanies !== undefined &&
      convexCompanies.length === 0 &&
      !isDemo &&
      user?.workosId
    ) {
      console.error('[CompanySelector] BUG DETECTED: selectedCompanyId exists but no companies returned!')
      logManualError('Company visibility bug: selectedCompanyId exists but listByOwner returned empty', {
        selectedCompanyId,
        workosId: user.workosId,
        userId: user.id,
        convexQueryLength: convexCompanies.length,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user?.id, user?.workosId, isDemo, selectedCompanyId, companies.length, convexCompanies])

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Don't show in demo mode or when user is not authenticated
  if (isDemo || !user) {
    return null
  }

  // Show loading skeleton while query is in flight (convexCompanies === undefined)
  const isLoadingCompanies = convexCompanies === undefined
  if (isLoadingCompanies) {
    return (
      <div className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
    )
  }

  // Show "create company" prompt only when query returned empty array (not undefined)
  if (companies.length === 0 && convexCompanies?.length === 0) {
    if (!onCreateNew) return null

    return (
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
      >
        <IconPlus size={16} className="text-muted-foreground shrink-0" />
        <span className="flex-1 text-left">Create your first company</span>
      </button>
    )
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
      >
        <IconBuildings size={16} className="text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedCompany?.name || 'Select company'}
        </span>
        <IconCaretDown
          size={16}
          className={cn(
            'text-muted-foreground shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => {
                setSelectedCompanyId(company.id)
                setIsOpen(false)
              }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors',
                selectedCompanyId === company.id && 'bg-secondary'
              )}
            >
              <IconBuildings size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 text-left">
                <div className="truncate">{company.name}</div>
                {company.code && (
                  <div className="text-xs text-muted-foreground">{company.code}</div>
                )}
              </div>
              {selectedCompanyId === company.id && (
                <IconCheck size={16} className="text-foreground shrink-0" />
              )}
            </button>
          ))}

          {onCreateNew && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  onCreateNew()
                  setIsOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-muted-foreground"
              >
                <IconPlus size={16} className="shrink-0" />
                <span>Add new company</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
