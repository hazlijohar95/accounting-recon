'use client'

import { IconFileText, IconEye } from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { useSetShowPaywall } from '@/lib/store'
import { statusColors } from './types'

/**
 * Demo Documents List - mock documents for demo mode
 */
export function DemoDocumentsList() {
  const mockDocuments = [
    {
      id: '1',
      name: 'Maybank_Statement_Jan2024.pdf',
      type: 'Bank Statement',
      date: 'Jan 15, 2024',
      status: 'completed',
      transactions: 47,
    },
    {
      id: '2',
      name: 'Invoice_ACME_Corp_001.pdf',
      type: 'Invoice',
      date: 'Jan 12, 2024',
      status: 'completed',
      transactions: 1,
    },
    {
      id: '3',
      name: 'CIMB_Statement_Dec2023.pdf',
      type: 'Bank Statement',
      date: 'Jan 10, 2024',
      status: 'processing',
      transactions: undefined,
    },
    {
      id: '4',
      name: 'Receipt_Office_Supplies.jpg',
      type: 'Receipt',
      date: 'Jan 8, 2024',
      status: 'completed',
      transactions: 1,
    },
  ]

  const setShowPaywall = useSetShowPaywall()

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Demo mode: Sample documents shown below
      </p>

      <ul className="border border-border divide-y divide-border" role="list">
        {mockDocuments.map((doc) => (
          <li
            key={doc.id}
            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <IconFileText size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.date}
                  {doc.transactions !== undefined && (
                    <span className="ml-1">· {doc.transactions} txns</span>
                  )}
                </p>
              </div>
            </div>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              {doc.type}
            </span>

            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium capitalize',
                statusColors[doc.status]
              )}
            >
              {doc.status}
            </span>

            <button
              onClick={() => setShowPaywall(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label="View document"
            >
              <IconEye size={16} />
            </button>
          </li>
        ))}
      </ul>

      <div className="text-center py-4">
        <button
          onClick={() => setShowPaywall(true)}
          className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors focus-ring"
        >
          Sign up to manage your documents
        </button>
      </div>
    </div>
  )
}
