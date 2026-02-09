import {
  IconWarningCircle,
  IconFileText,
  IconCheckCircle,
  IconXCircle,
  IconFlag,
  IconUpload,
  IconCheck,
} from '@/components/brand/icons'
import { CodeBlock } from '../code-block'

export function StatusIndicatorsDemo() {
  return (
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
              <span className="text-xs text-muted-foreground">&ge;90%</span>
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
  )
}

export function AlertsEmptyStatesDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Alerts & Empty States
      </h3>

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-border p-6 space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Warning Alert</h4>
          <div className="flex items-start gap-3 border border-border p-4">
            <IconWarningCircle size={16} className="text-destructive shrink-0 mt-0.5" />
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
              <IconFileText size={24} className="text-muted-foreground" />
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
  )
}

export function TimelineDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Timeline
      </h3>

      <div className="border border-border p-6">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            <div className="relative pl-10">
              <div className="absolute left-2 w-4 h-4 bg-emerald-500 flex items-center justify-center">
                <IconCheckCircle size={12} className="text-background" />
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
                <IconFlag size={12} className="text-background" />
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
                <IconUpload size={12} className="text-background" />
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
                <IconXCircle size={12} className="text-background" />
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
  )
}
