'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Upload,
  GitCompare,
  FileText,
  X,
  Check,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Calendar,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
} from 'lucide-react'
import { CodeBlock } from './code-block'

type ButtonState = 'default' | 'hover' | 'active' | 'disabled'

function StateToggle({
  state,
  onChange,
}: {
  state: ButtonState
  onChange: (state: ButtonState) => void
}) {
  const states: ButtonState[] = ['default', 'hover', 'active', 'disabled']
  return (
    <div className="flex gap-1 text-xs">
      {states.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'px-2 py-1 capitalize',
            state === s ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function ButtonPreview({ variant, state }: { variant: 'primary' | 'secondary' | 'destructive' | 'icon'; state: ButtonState }) {
  const baseClasses = 'px-4 py-2 text-sm transition-colors flex items-center gap-2'

  const variants = {
    primary: cn(
      baseClasses,
      'bg-foreground text-background',
      state === 'hover' && 'bg-foreground/90',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
    secondary: cn(
      baseClasses,
      'border border-border',
      state === 'hover' && 'bg-secondary',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
    destructive: cn(
      baseClasses,
      'bg-destructive text-destructive-foreground',
      state === 'hover' && 'bg-destructive/90',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
    icon: cn(
      'p-1.5 text-muted-foreground transition-colors',
      state === 'hover' && 'text-foreground bg-secondary',
      state === 'disabled' && 'opacity-50 cursor-not-allowed'
    ),
  }

  const labels = {
    primary: 'Primary Action',
    secondary: 'Secondary',
    destructive: 'Delete',
    icon: null,
  }

  return (
    <button className={variants[variant]} disabled={state === 'disabled'}>
      {variant === 'icon' ? <X className="w-4 h-4" /> : labels[variant]}
    </button>
  )
}

export function ComponentsSection() {
  const [buttonState, setButtonState] = useState<ButtonState>('default')
  const [activeNavItem, setActiveNavItem] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [checkboxChecked, setCheckboxChecked] = useState(false)

  return (
    <section id="components" className="space-y-12">
      <div>
        <h2 className="text-xl font-medium">Components</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Interactive UI components and their various states.
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Buttons
        </h3>

        <div className="border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Preview state:</span>
            <StateToggle state={buttonState} onChange={setButtonState} />
          </div>

          <div className="flex items-center gap-4">
            <ButtonPreview variant="primary" state={buttonState} />
            <ButtonPreview variant="secondary" state={buttonState} />
            <ButtonPreview variant="destructive" state={buttonState} />
            <ButtonPreview variant="icon" state={buttonState} />
          </div>

          <CodeBlock
            code={`// Primary
<button className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90">
  Primary Action
</button>

// Secondary
<button className="px-4 py-2 border border-border text-sm hover:bg-secondary">
  Secondary
</button>

// Destructive
<button className="px-4 py-2 bg-destructive text-destructive-foreground text-sm">
  Delete
</button>

// Icon
<button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
  <X className="w-4 h-4" />
</button>`}
            language="tsx"
          />
        </div>
      </div>

      {/* Form Inputs */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Form Inputs
        </h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Text Input */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Text Input</h4>
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
            />
            <CodeBlock
              code={`<input
  type="text"
  placeholder="Enter text..."
  className="w-full px-3 py-2 border border-border bg-background text-sm
    placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
/>`}
              language="tsx"
            />
          </div>

          {/* File Input */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">File Input</h4>
            <label className="block w-full border border-dashed border-border p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
              <input type="file" className="hidden" />
              <div className="text-center">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2 block">
                  Click to upload
                </span>
              </div>
            </label>
            <CodeBlock
              code={`<label className="block border border-dashed border-border p-4 cursor-pointer hover:bg-secondary/50">
  <input type="file" className="hidden" />
  <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
  <span className="text-sm text-muted-foreground">Click to upload</span>
</label>`}
              language="tsx"
            />
          </div>

          {/* Checkbox */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Checkbox</h4>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                onClick={() => setCheckboxChecked(!checkboxChecked)}
                className={cn(
                  'w-5 h-5 border flex items-center justify-center transition-colors',
                  checkboxChecked ? 'bg-foreground border-foreground' : 'border-border'
                )}
              >
                {checkboxChecked && <Check className="w-3 h-3 text-background" />}
              </button>
              <span className="text-sm">Enable feature</span>
            </label>
            <CodeBlock
              code={`<button
  className={cn(
    'w-5 h-5 border flex items-center justify-center',
    checked ? 'bg-foreground border-foreground' : 'border-border'
  )}
>
  {checked && <Check className="w-3 h-3 text-background" />}
</button>`}
              language="tsx"
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Cards
        </h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Stats Card */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Stats Card</h4>
            <div className="border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                <ArrowUpRight className="w-3 h-3" />
                Cash In
              </div>
              <div className="mt-2 text-2xl font-medium">$12,450.00</div>
              <div className="text-xs text-muted-foreground mt-1">+5.2% from last month</div>
            </div>
            <CodeBlock
              code={`<div className="border border-border p-4">
  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
    <ArrowUpRight className="w-3 h-3" />
    Cash In
  </div>
  <div className="mt-2 text-2xl font-medium">$12,450.00</div>
  <div className="text-xs text-muted-foreground mt-1">+5.2% from last month</div>
</div>`}
              language="tsx"
            />
          </div>

          {/* List Container */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">List Container</h4>
            <div className="border border-border">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-sm font-medium">Recent Items</span>
              </div>
              <div className="divide-y divide-border">
                {['Item One', 'Item Two', 'Item Three'].map((item) => (
                  <div key={item} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">{item}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Navigation
        </h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Sidebar Nav */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Sidebar Navigation</h4>
            <div className="bg-secondary/30 p-2">
              <ul className="space-y-1">
                {[
                  { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
                  { icon: <Upload className="w-4 h-4" />, label: 'Upload' },
                  { icon: <GitCompare className="w-4 h-4" />, label: 'Reconcile' },
                  { icon: <FileText className="w-4 h-4" />, label: 'Reports' },
                ].map((item, i) => (
                  <li key={item.label}>
                    <button
                      onClick={() => setActiveNavItem(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                        activeNavItem === i
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Tab Navigation</h4>
            <div className="flex border-b border-border">
              {['Pending', 'Matched', 'Suspense'].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    'px-4 py-3 text-sm capitalize transition-colors',
                    activeTab === i
                      ? 'border-b-2 border-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab} ({i + 1})
                </button>
              ))}
            </div>
            <CodeBlock
              code={`<div className="flex border-b border-border">
  {tabs.map((tab, i) => (
    <button
      className={cn(
        'px-4 py-3 text-sm transition-colors',
        active === i
          ? 'border-b-2 border-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {tab}
    </button>
  ))}
</div>`}
              language="tsx"
            />
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Status Indicators
        </h3>

        <div className="grid grid-cols-3 gap-6">
          {/* Dot Indicators */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Dot Indicators</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-foreground" />
                <span className="text-sm">Matched</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-destructive" />
                <span className="text-sm">Suspense</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-muted-foreground" />
                <span className="text-sm">Pending</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Confidence Badges</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-foreground text-background text-xs">high</span>
                <span className="text-xs text-muted-foreground">≥90%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-secondary text-xs">medium</span>
                <span className="text-xs text-muted-foreground">70-89%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-destructive/20 text-xs">low</span>
                <span className="text-xs text-muted-foreground">&lt;70%</span>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Progress Bar</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span>Progress</span>
                  <span className="text-muted-foreground">75%</span>
                </div>
                <div className="h-1 bg-secondary">
                  <div className="h-full bg-foreground w-3/4" />
                </div>
              </div>
              <CodeBlock
                code={`<div className="h-1 bg-secondary">
  <div className="h-full bg-foreground" style={{ width: '75%' }} />
</div>`}
                language="tsx"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Modal
        </h3>

        <div className="border border-border p-6 space-y-4">
          <div className="relative bg-muted/50 p-8">
            {/* Mock backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

            {/* Mock modal */}
            <div className="relative bg-background border border-border max-w-md mx-auto">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Modal Title</h4>
                  <p className="text-xs text-muted-foreground mt-1">Supporting text</p>
                </div>
                <button className="p-2 hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Modal content goes here.</p>
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <button className="px-4 py-2 border border-border text-sm hover:bg-secondary">
                  Cancel
                </button>
                <button className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90">
                  Confirm
                </button>
              </div>
            </div>
          </div>

          <CodeBlock
            code={`<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

  {/* Modal */}
  <div className="relative bg-background border border-border">
    <div className="p-4 border-b border-border flex items-center justify-between">
      <h4 className="text-sm font-medium">Title</h4>
      <button className="p-2 hover:bg-secondary">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="p-4">Content</div>
    <div className="p-4 border-t border-border flex justify-end gap-2">
      <button className="px-4 py-2 border border-border">Cancel</button>
      <button className="px-4 py-2 bg-foreground text-background">Confirm</button>
    </div>
  </div>
</div>`}
            language="tsx"
          />
        </div>
      </div>

      {/* Alert / Empty State */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Alerts & Empty States
        </h3>

        <div className="grid grid-cols-2 gap-6">
          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Warning Alert</h4>
            <div className="flex items-start gap-3 border border-border p-4">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium">Attention required</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Some items need your review before proceeding.
                </div>
              </div>
            </div>
          </div>

          <div className="border border-border p-6 space-y-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Empty State</h4>
            <div className="border border-border p-8 text-center">
              <div className="w-12 h-12 border border-border mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-sm mt-4">No items found</div>
              <div className="text-xs text-muted-foreground mt-1">
                Upload a file to get started
              </div>
              <button className="mt-4 px-4 py-2 border border-border text-sm hover:bg-secondary">
                Upload File
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
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
                      <Check className="w-3 h-3 text-background" />
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

      {/* Timeline */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Timeline
        </h3>

        <div className="border border-border p-6">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            {/* Timeline items */}
            <div className="space-y-6">
              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-background" />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">Transaction Matched</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Auto-matched with Invoice #1234 (100% confidence)
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
              </div>

              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-amber-500 flex items-center justify-center">
                  <Flag className="w-3 h-3 text-background" />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">Review Required</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Potential match found for TXN-789 (78% confidence)
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">5 hours ago</div>
                </div>
              </div>

              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-foreground flex items-center justify-center">
                  <Upload className="w-3 h-3 text-background" />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">Bank Statement Uploaded</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      January 2024 statement - 156 transactions imported
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">1 day ago</div>
                </div>
              </div>

              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-red-500 flex items-center justify-center">
                  <XCircle className="w-3 h-3 text-background" />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">Moved to Suspense</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      3 unmatched transactions flagged for investigation
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">2 days ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Diff View */}
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

      {/* Filter/Search Panel */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Filter & Search Panel
        </h3>

        <div className="border border-border p-6 space-y-6">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <button className="px-4 py-2 border border-border hover:bg-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              <span className="px-1.5 py-0.5 bg-foreground text-background text-xs">3</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-sm">
              <span>Status: Pending</span>
              <button className="hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-sm">
              <span>Date: Jan 2024</span>
              <button className="hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-sm">
              <span>Amount: &gt;$500</span>
              <button className="hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          </div>

          {/* Expanded Filter Panel */}
          <div className="border border-border p-4 space-y-4 bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Advanced Filters</span>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                Reset
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <button className="flex-1 px-3 py-2 border border-border text-sm text-left flex items-center justify-between hover:bg-secondary">
                    <span>Jan 1, 2024</span>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <button className="flex-1 px-3 py-2 border border-border text-sm text-left flex items-center justify-between hover:bg-secondary">
                    <span>Jan 31, 2024</span>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Amount Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="text"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 bg-foreground text-background text-xs">
                    All
                  </button>
                  <button className="px-3 py-1.5 border border-border text-xs hover:bg-secondary">
                    Matched
                  </button>
                  <button className="px-3 py-1.5 border border-border text-xs hover:bg-secondary">
                    Pending
                  </button>
                  <button className="px-3 py-1.5 border border-border text-xs hover:bg-secondary">
                    Suspense
                  </button>
                </div>
              </div>
            </div>

            {/* Confidence Slider */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Minimum Confidence
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="70"
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-right">70%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
