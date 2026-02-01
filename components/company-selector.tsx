'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuth } from './auth-provider'
import { useCompanyState, useIsDemo } from '@/lib/store'
import { IconBuildings, IconCaretDown, IconPlus, IconCheck } from '@/components/brand/icons'
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
  const convexCompanies = useQuery(
    api.companies.listByOwner,
    user && !isDemo ? { workosUserId: user.workosId } : 'skip'
  )

  // Sync companies to store
  React.useEffect(() => {
    if (convexCompanies) {
      console.log('[CompanySelector] Received companies from Convex:', convexCompanies.length)
      const mapped = convexCompanies.map((c: { _id: Id<'companies'>; name: string; code?: string }) => ({
        id: c._id,
        name: c.name,
        code: c.code,
      }))
      setCompanies(mapped)

      // Auto-select first company if none selected
      if (!selectedCompanyId && mapped.length > 0) {
        console.log('[CompanySelector] Auto-selecting first company:', mapped[0].id, mapped[0].name)
        setSelectedCompanyId(mapped[0].id)
      }
    } else if (convexCompanies === undefined) {
      console.log('[CompanySelector] Query loading...')
    }
  }, [convexCompanies, selectedCompanyId, setSelectedCompanyId, setCompanies])

  // Log state changes
  React.useEffect(() => {
    console.log('[CompanySelector] State:', {
      userId: user?.id,
      isDemo,
      selectedCompanyId,
      companiesInStore: companies.length,
      convexQueryResult: convexCompanies === undefined ? 'loading' : convexCompanies?.length ?? 0,
    })
  }, [user?.id, isDemo, selectedCompanyId, companies.length, convexCompanies])

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
