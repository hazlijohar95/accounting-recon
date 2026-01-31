'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/brand'
import { ErrorBoundary } from '@/components/ui/error-boundary'

interface TransactionsTableProps {
  companyId: Id<"companies">
  type?: 'cash' | 'accrual'
  status?: 'pending' | 'matched' | 'suspense'
  limit?: number
  showFilters?: boolean
  pageSize?: number
}

type SortField = 'date' | 'amount' | 'description'
type SortDirection = 'asc' | 'desc'

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function TransactionsTable(props: TransactionsTableProps) {
  return (
    <ErrorBoundary componentName="TransactionsTable">
      <TransactionsTableContent {...props} />
    </ErrorBoundary>
  )
}

function TransactionsTableContent({
  companyId,
  type,
  status,
  limit,
  showFilters = true,
  pageSize = 20,
}: TransactionsTableProps) {
  // State for filters
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search query (300ms)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch transactions
  const transactions = useQuery(api.transactions.listByCompany, {
    companyId,
    type,
    status,
    limit,
  })

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    let result = [...transactions]

    // Apply search filter (using debounced value)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.reference?.toLowerCase().includes(query)
      )
    }

    // Apply date filters
    if (dateFrom) {
      result = result.filter((tx) => tx.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((tx) => tx.date <= dateTo)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = a.date.localeCompare(b.date)
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'description':
          comparison = a.description.localeCompare(b.description)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [transactions, debouncedSearch, dateFrom, dateTo, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTransactions.slice(start, start + pageSize)
  }, [filteredTransactions, currentPage, pageSize])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, dateFrom, dateTo])

  // Calculate totals
  const totals = useMemo(() => {
    const credits = filteredTransactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)
    const debits = filteredTransactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    return { credits, debits, net: credits - debits }
  }, [filteredTransactions])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
  }, [])

  const hasFilters = searchQuery || dateFrom || dateTo

  if (transactions === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Search transactions by description or reference"
            />
          </div>

          {/* Date filters and clear */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              <label className="sr-only" htmlFor="date-from">From date</label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <label className="sr-only" htmlFor="date-to">To date</label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
              />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground focus-ring px-2 py-1"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards - Responsive */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        role="region"
        aria-label="Transaction summary"
      >
        <div className="p-4 bg-credit-light/30 border border-credit/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Credits</div>
          <div className="text-xl font-mono font-medium text-credit mt-1">
            +{formatAmount(totals.credits)}
          </div>
        </div>
        <div className="p-4 bg-debit-light/30 border border-debit/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Debits</div>
          <div className="text-xl font-mono font-medium text-debit mt-1">
            -{formatAmount(totals.debits)}
          </div>
        </div>
        <div className="p-4 bg-secondary/30 border border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Net</div>
          <div
            className={cn(
              'text-xl font-mono font-medium mt-1',
              totals.net >= 0 ? 'text-credit' : 'text-debit'
            )}
          >
            {totals.net >= 0 ? '+' : '-'}
            {formatAmount(Math.abs(totals.net))}
          </div>
        </div>
      </div>

      {/* Table - Desktop / Cards - Mobile */}
      <div className="border border-border overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <caption className="sr-only">
              Transactions list showing {filteredTransactions.length} transactions.
              Sortable by date, description, and amount.
            </caption>
            <thead className="bg-secondary/30">
              <tr>
                <SortableHeader
                  field="date"
                  label="Date"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  field="description"
                  label="Description"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Reference
                </th>
                <SortableHeader
                  field="amount"
                  label="Amount"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.amount > 0 ? (
                          <ArrowDownLeft
                            className="w-4 h-4 text-credit flex-shrink-0"
                            aria-label="Credit"
                          />
                        ) : (
                          <ArrowUpRight
                            className="w-4 h-4 text-debit flex-shrink-0"
                            aria-label="Debit"
                          />
                        )}
                        <span className="truncate max-w-[300px]" title={tx.description}>
                          {tx.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {tx.reference || '-'}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-mono whitespace-nowrap',
                        tx.amount > 0 ? 'text-credit' : 'text-debit'
                      )}
                    >
                      {tx.amount > 0 ? '+' : '-'}
                      {formatAmount(Math.abs(tx.amount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {paginatedTransactions.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            paginatedTransactions.map((tx) => (
              <div key={tx._id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {tx.amount > 0 ? (
                      <ArrowDownLeft
                        className="w-4 h-4 text-credit flex-shrink-0 mt-0.5"
                        aria-label="Credit"
                      />
                    ) : (
                      <ArrowUpRight
                        className="w-4 h-4 text-debit flex-shrink-0 mt-0.5"
                        aria-label="Debit"
                      />
                    )}
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                  </div>
                  <p
                    className={cn(
                      'text-sm font-mono font-medium flex-shrink-0',
                      tx.amount > 0 ? 'text-credit' : 'text-debit'
                    )}
                  >
                    {tx.amount > 0 ? '+' : '-'}
                    {formatAmount(Math.abs(tx.amount))}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatDate(tx.date)}</span>
                    {tx.reference && (
                      <span className="font-mono">{tx.reference}</span>
                    )}
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
        </span>
        {limit && transactions.length >= limit && (
          <span>Results limited to {limit}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Sortable table header with aria-sort
 */
function SortableHeader({
  field,
  label,
  currentField,
  direction,
  onSort,
  align = 'left',
}: {
  field: SortField
  label: string
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const isActive = field === currentField
  const ariaSortValue = isActive
    ? direction === 'asc'
      ? 'ascending'
      : 'descending'
    : undefined

  return (
    <th
      scope="col"
      aria-sort={ariaSortValue}
      className={cn(
        'px-4 py-3 font-medium cursor-pointer select-none hover:bg-secondary/50 transition-colors',
        align === 'right' && 'text-right'
      )}
    >
      <button
        onClick={() => onSort(field)}
        className={cn(
          'flex items-center gap-1 focus-ring',
          align === 'right' && 'ml-auto'
        )}
        aria-label={`Sort by ${label} ${isActive ? (direction === 'asc' ? 'descending' : 'ascending') : 'descending'}`}
      >
        {label}
        <span aria-hidden="true">
          {isActive ? (
            direction === 'asc' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )
          ) : (
            <ChevronDown className="w-3 h-3 opacity-30" />
          )}
        </span>
      </button>
    </th>
  )
}

/**
 * Status badge component with design tokens
 */
function StatusBadge({ status }: { status: 'pending' | 'matched' | 'suspense' }) {
  const styles = {
    pending: 'bg-warning-light text-warning',
    matched: 'bg-success-light text-success',
    suspense: 'bg-error-light text-error',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium',
        styles[status]
      )}
      role="status"
    >
      {status}
    </span>
  )
}

/**
 * Pagination component
 */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  pageSize: number
}) {
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <nav
      className="flex flex-col sm:flex-row items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <span className="text-xs text-muted-foreground">
        {start}-{end} of {totalItems}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-ring"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-ring"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 text-sm font-mono">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-ring"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-ring"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}

/**
 * Format amount with currency
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
