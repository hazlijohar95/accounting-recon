'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuth } from './auth-provider'
import { useCompanyState, useIsDemo } from '@/lib/store'
import { Building2, ChevronDown, Plus, Check } from 'lucide-react'
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

  // Fetch companies from Convex (ownerId derived from auth context on backend)
  const convexCompanies = useQuery(
    api.companies.listByOwner,
    user && !isDemo ? {} : 'skip'
  )

  // Sync companies to store
  React.useEffect(() => {
    if (convexCompanies) {
      const mapped = convexCompanies.map((c: { _id: Id<'companies'>; name: string; code?: string }) => ({
        id: c._id,
        name: c.name,
        code: c.code,
      }))
      setCompanies(mapped)

      // Auto-select first company if none selected
      if (!selectedCompanyId && mapped.length > 0) {
        setSelectedCompanyId(mapped[0].id)
      }
    }
  }, [convexCompanies, selectedCompanyId, setSelectedCompanyId, setCompanies])

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

  // Don't show if no companies loaded yet
  if (!companies.length) {
    return null
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
      >
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedCompany?.name || 'Select company'}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
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
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-left">
                <div className="truncate">{company.name}</div>
                {company.code && (
                  <div className="text-xs text-muted-foreground">{company.code}</div>
                )}
              </div>
              {selectedCompanyId === company.id && (
                <Check className="w-4 h-4 text-foreground shrink-0" />
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
                <Plus className="w-4 h-4 shrink-0" />
                <span>Add new company</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
