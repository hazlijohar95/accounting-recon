import { cn } from '@/lib/utils'

export function PatternsSection() {
  return (
    <section id="patterns" className="space-y-12">
      <div>
        <h2 className="text-xl font-medium">Patterns</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Layout structures, spacing conventions, and visual patterns used throughout the application.
        </p>
      </div>

      {/* Layouts */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Layouts
        </h3>

        {/* Sidebar + Main */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Sidebar + Main</h4>
          <div className="border border-border h-48">
            <div className="flex h-full">
              <div className="w-48 border-r border-border bg-secondary/30 p-3">
                <div className="w-16 h-4 bg-foreground mb-4" />
                <div className="space-y-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn('h-6 px-2 flex items-center', i === 1 && 'bg-secondary')}>
                      <div className="w-4 h-4 bg-muted-foreground/30 mr-2" />
                      <div className="w-12 h-2 bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="w-24 h-4 bg-foreground/20 mb-4" />
                <div className="w-full h-20 bg-secondary" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Primary application layout. Sidebar width: 224px (w-56). Main content fills remaining space.
          </p>
        </div>

        {/* Split View */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Split View (List + Detail)</h4>
          <div className="border border-border h-48">
            <div className="flex h-full">
              <div className="flex-1 border-r border-border">
                <div className="p-3 border-b border-border">
                  <div className="w-20 h-3 bg-foreground/20" />
                </div>
                <div className="flex border-b border-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn('px-3 py-2 text-xs', i === 1 && 'border-b-2 border-foreground')}>
                      <div className="w-12 h-2 bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn('p-3', i === 2 && 'bg-secondary')}>
                      <div className="w-32 h-2 bg-foreground/20 mb-1" />
                      <div className="w-16 h-2 bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-80 bg-secondary/30 p-3">
                <div className="w-20 h-3 bg-foreground/20 mb-4" />
                <div className="border border-border bg-background p-3">
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-muted-foreground/30" />
                    <div className="w-3/4 h-2 bg-muted-foreground/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Used for reconciliation view. List panel with tabs, detail panel fixed at 384px (w-96).
          </p>
        </div>

        {/* Card Grid */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Stats Card Grid</h4>
          <div className="border border-border p-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-muted-foreground/30" />
                    <div className="w-12 h-2 bg-muted-foreground/30" />
                  </div>
                  <div className="w-16 h-5 bg-foreground/20" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            4-column grid for dashboard stats. Gap: 16px (gap-4). Cards have consistent padding: 16px (p-4).
          </p>
        </div>
      </div>

      {/* Spacing */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Spacing
        </h3>

        {/* Spacing Scale */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Base Unit: 4px</h4>
          <div className="border border-border p-4">
            <div className="flex items-end gap-4">
              {[
                { name: '1', size: 4 },
                { name: '2', size: 8 },
                { name: '3', size: 12 },
                { name: '4', size: 16 },
                { name: '6', size: 24 },
                { name: '8', size: 32 },
              ].map(({ name, size }) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div className="bg-foreground" style={{ width: size, height: size }} />
                  <span className="text-xs text-muted-foreground font-mono">p-{name}</span>
                  <span className="text-[10px] text-muted-foreground">{size}px</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Common Patterns */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Common Padding Patterns</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border">
              <div className="p-2 bg-secondary/50">
                <div className="bg-background border border-dashed border-border p-4 text-center">
                  <span className="text-xs text-muted-foreground">content</span>
                </div>
              </div>
              <div className="p-2 text-center border-t border-border">
                <span className="text-xs font-mono">p-2</span>
                <span className="text-[10px] text-muted-foreground block">Tight (8px)</span>
              </div>
            </div>
            <div className="border border-border">
              <div className="p-4 bg-secondary/50">
                <div className="bg-background border border-dashed border-border p-4 text-center">
                  <span className="text-xs text-muted-foreground">content</span>
                </div>
              </div>
              <div className="p-2 text-center border-t border-border">
                <span className="text-xs font-mono">p-4</span>
                <span className="text-[10px] text-muted-foreground block">Default (16px)</span>
              </div>
            </div>
            <div className="border border-border">
              <div className="p-6 bg-secondary/50">
                <div className="bg-background border border-dashed border-border p-4 text-center">
                  <span className="text-xs text-muted-foreground">content</span>
                </div>
              </div>
              <div className="p-2 text-center border-t border-border">
                <span className="text-xs font-mono">p-6</span>
                <span className="text-[10px] text-muted-foreground block">Spacious (24px)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gap Patterns */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Gap Patterns</h4>
          <div className="border border-border p-4 space-y-4">
            {[
              { name: 'gap-2', value: 8 },
              { name: 'gap-3', value: 12 },
              { name: 'gap-4', value: 16 },
            ].map(({ name, value }) => (
              <div key={name} className="flex items-center">
                <span className="w-16 text-xs font-mono">{name}</span>
                <div className="flex" style={{ gap: value }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 bg-secondary border border-border" />
                  ))}
                </div>
                <span className="ml-4 text-xs text-muted-foreground">{value}px</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Borders & Shadows */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Borders & Shadows
        </h3>

        {/* Border Styles */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Border Styles</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border p-4">
              <div className="border border-border h-16 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Solid</span>
              </div>
              <div className="text-xs font-mono mt-2 text-center">border border-border</div>
            </div>
            <div className="border border-border p-4">
              <div className="border border-dashed border-border h-16 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Dashed</span>
              </div>
              <div className="text-xs font-mono mt-2 text-center">border-dashed</div>
            </div>
            <div className="border border-border p-4">
              <div className="divide-y divide-border">
                <div className="py-2 text-center text-xs text-muted-foreground">Item 1</div>
                <div className="py-2 text-center text-xs text-muted-foreground">Item 2</div>
                <div className="py-2 text-center text-xs text-muted-foreground">Item 3</div>
              </div>
              <div className="text-xs font-mono mt-2 text-center">divide-y divide-border</div>
            </div>
          </div>
        </div>

        {/* Shadow */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Shadow</h4>
          <div className="border border-border p-6">
            <div className="flex items-center gap-8">
              <div
                className="w-24 h-24 bg-background border border-border"
                style={{
                  boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.05)',
                }}
              />
              <div className="text-xs space-y-2">
                <div className="font-mono">box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05)</div>
                <div className="text-muted-foreground">
                  Extremely subtle shadow. X: 0, Y: 1px, Blur: 2px, Spread: 0, Opacity: 5%
                </div>
                <div className="text-muted-foreground">
                  CSS variables: --shadow-y: 1px, --shadow-blur: 2px, --shadow-opacity: 0.05
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No Rounded Corners */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Geometry: Sharp Edges</h4>
          <div className="border border-border p-6">
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-foreground" />
                <span className="text-xs text-foreground flex items-center gap-1">
                  <span className="w-3 h-3 bg-foreground text-background flex items-center justify-center text-[10px]">✓</span>
                  Correct
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-muted rounded-lg" />
                <span className="text-xs text-destructive flex items-center gap-1">
                  <span className="w-3 h-3 bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]">✗</span>
                  Incorrect
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                All elements use sharp, square corners. Border radius is set to 0rem (--radius: 0rem).
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
