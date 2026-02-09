import {
  IconArrowRight,
  IconCaretRight,
} from '@/components/brand/icons'

export function CardsDemo() {
  return (
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
              <IconArrowRight size={12} />
              Cash In
            </div>
            <div className="mt-2 text-2xl font-medium">$12,450.00</div>
            <div className="text-xs text-muted-foreground mt-1">+5.2% from last month</div>
          </div>
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
                  <IconCaretRight size={16} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
