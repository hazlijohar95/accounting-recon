import { IconCheck } from '@/components/brand/icons'

export function DataTableDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Data Table
      </h3>

      <div className="border border-border">
        {/* Table Header with Actions */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Transactions</span>
            <span className="text-xs text-muted-foreground">156 items</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs border border-border hover:bg-secondary">
              Export
            </button>
            <button className="px-3 py-1.5 text-xs bg-foreground text-background hover:bg-foreground/90">
              Batch Match
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium w-8">
                  <button className="w-4 h-4 border border-border hover:bg-secondary" />
                </th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <button className="w-4 h-4 border border-border hover:bg-secondary" />
                </td>
                <td className="px-4 py-3 font-mono text-xs">2024-01-15</td>
                <td className="px-4 py-3">ACME Corp Payment</td>
                <td className="px-4 py-3 text-right font-mono">$1,250.00</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs">
                    <div className="w-1.5 h-1.5 bg-emerald-500" />
                    Matched
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">100%</td>
              </tr>
              <tr className="hover:bg-secondary/30 transition-colors bg-amber-500/5">
                <td className="px-4 py-3">
                  <button className="w-4 h-4 border border-border hover:bg-secondary" />
                </td>
                <td className="px-4 py-3 font-mono text-xs">2024-01-14</td>
                <td className="px-4 py-3">Vendor Payment - Supplies</td>
                <td className="px-4 py-3 text-right font-mono">-$850.00</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs">
                    <div className="w-1.5 h-1.5 bg-amber-500" />
                    Review
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">78%</td>
              </tr>
              <tr className="hover:bg-secondary/30 transition-colors bg-red-500/5">
                <td className="px-4 py-3">
                  <button className="w-4 h-4 border border-foreground bg-foreground">
                    <IconCheck size={12} className="text-background" />
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs">2024-01-13</td>
                <td className="px-4 py-3">Unknown Transfer</td>
                <td className="px-4 py-3 text-right font-mono">$2,500.00</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-500 text-xs">
                    <div className="w-1.5 h-1.5 bg-red-500" />
                    Suspense
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Showing 1-3 of 156</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-xs border border-border hover:bg-secondary disabled:opacity-50" disabled>
              Prev
            </button>
            <button className="px-3 py-1 text-xs bg-foreground text-background">1</button>
            <button className="px-3 py-1 text-xs border border-border hover:bg-secondary">2</button>
            <button className="px-3 py-1 text-xs border border-border hover:bg-secondary">3</button>
            <button className="px-3 py-1 text-xs border border-border hover:bg-secondary">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ComparisonDiffDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Comparison Diff View
      </h3>

      <div className="border border-border">
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* Left: Bank Transaction */}
          <div>
            <div className="p-4 bg-muted/50 border-b border-border">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Bank Transaction
              </span>
            </div>
            <div className="divide-y divide-border text-sm">
              <div className="px-4 py-3 flex justify-between bg-emerald-500/5">
                <span className="text-muted-foreground">Date</span>
                <span className="font-mono">2024-01-15</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-emerald-500/5">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono">$1,250.00</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-amber-500/5">
                <span className="text-muted-foreground">Description</span>
                <span className="font-mono text-xs">ACME CORP PYMT</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">TXN-789456</span>
              </div>
            </div>
          </div>

          {/* Right: Invoice */}
          <div>
            <div className="p-4 bg-muted/50 border-b border-border">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Invoice #1234
              </span>
            </div>
            <div className="divide-y divide-border text-sm">
              <div className="px-4 py-3 flex justify-between bg-emerald-500/5">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-mono">2024-01-15</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-emerald-500/5">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono">$1,250.00</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-amber-500/5">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-mono text-xs">ACME Corporation</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">INV-1234</span>
              </div>
            </div>
          </div>
        </div>

        {/* Match Summary */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500" />
              <span className="text-xs">2 exact matches</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500" />
              <span className="text-xs">1 fuzzy match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted" />
              <span className="text-xs">1 no match</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">85%</span>
            <span className="text-xs text-muted-foreground">confidence</span>
          </div>
        </div>
      </div>
    </div>
  )
}
