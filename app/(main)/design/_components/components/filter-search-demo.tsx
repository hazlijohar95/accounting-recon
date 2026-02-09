'use client'

import {
  IconSearch,
  IconFilter,
  IconX,
  IconArrowRight,
  IconCalendar,
} from '@/components/brand/icons'

export function FilterSearchDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Filter & Search Panel
      </h3>

      <div className="border border-border p-6 space-y-6">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
            />
          </div>
          <button className="px-4 py-2 border border-border hover:bg-secondary flex items-center gap-2">
            <IconFilter size={16} />
            <span className="text-sm">Filters</span>
            <span className="px-1.5 py-0.5 bg-foreground text-background text-xs">3</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-sm">
            <span>Status: Pending</span>
            <button className="hover:text-foreground">
              <IconX size={12} />
            </button>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-sm">
            <span>Date: Jan 2024</span>
            <button className="hover:text-foreground">
              <IconX size={12} />
            </button>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-sm">
            <span>Amount: &gt;$500</span>
            <button className="hover:text-foreground">
              <IconX size={12} />
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
                  <IconCalendar size={16} className="text-muted-foreground" />
                </button>
                <IconArrowRight size={16} className="text-muted-foreground" />
                <button className="flex-1 px-3 py-2 border border-border text-sm text-left flex items-center justify-between hover:bg-secondary">
                  <span>Jan 31, 2024</span>
                  <IconCalendar size={16} className="text-muted-foreground" />
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
  )
}
