import { LogoMark, LogoFull, LogoStacked } from '@/components/brand'

export function LogoSection() {
  return (
    <section id="logo" className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Logo</h2>
        <p className="text-sm text-muted-foreground mt-2">
          The Reconcile logo is a geometric "R" built from rectangles, reflecting our sharp, minimal aesthetic.
        </p>
      </div>

      {/* Logo Variations */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Variations
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="border border-border p-6 flex flex-col items-center justify-center gap-4">
            <LogoMark size={48} />
            <span className="text-xs text-muted-foreground">Icon Only</span>
          </div>
          <div className="border border-border p-6 flex flex-col items-center justify-center gap-4">
            <LogoFull />
            <span className="text-xs text-muted-foreground">Horizontal</span>
          </div>
          <div className="border border-border p-6 flex flex-col items-center justify-center gap-4">
            <LogoStacked />
            <span className="text-xs text-muted-foreground">Stacked</span>
          </div>
          <div className="border border-border p-6 flex flex-col items-center justify-center gap-4 bg-foreground text-background">
            <LogoMark size={48} />
            <span className="text-xs text-background/70">Inverted</span>
          </div>
        </div>
      </div>

      {/* Clear Space */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Clear Space
        </h3>
        <div className="border border-border p-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 border border-dashed border-muted-foreground -m-8" />
            <div className="absolute -top-8 left-0 right-0 flex justify-center">
              <span className="text-[10px] text-muted-foreground bg-background px-1">1x</span>
            </div>
            <div className="absolute -left-8 top-0 bottom-0 flex items-center">
              <span className="text-[10px] text-muted-foreground bg-background px-1">1x</span>
            </div>
            <LogoFull />
          </div>
          <p className="text-xs text-muted-foreground mt-8">
            Minimum clear space around the logo equals the height of the logo mark (1x).
          </p>
        </div>
      </div>

      {/* Minimum Sizes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Minimum Sizes
        </h3>
        <div className="flex items-end gap-8 border border-border p-6">
          <div className="flex flex-col items-center gap-2">
            <LogoMark size={32} />
            <span className="text-xs text-muted-foreground">32px (icon)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-[120px]">
              <LogoFull />
            </div>
            <span className="text-xs text-muted-foreground">120px (full)</span>
          </div>
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Usage Guidelines
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border p-6">
            <div className="text-xs text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-foreground flex items-center justify-center text-background text-[10px]">✓</span>
              Do
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <LogoMark size={24} />
                <span className="text-xs text-muted-foreground">Use on solid backgrounds</span>
              </div>
              <div className="flex items-center gap-3">
                <LogoMark size={24} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Monochrome only</span>
              </div>
            </div>
          </div>
          <div className="border border-border p-6">
            <div className="text-xs text-destructive uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-destructive flex items-center justify-center text-destructive-foreground text-[10px]">✗</span>
              Don't
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <LogoMark size={24} className="rotate-12" />
                <span className="text-xs text-muted-foreground">Rotate or skew</span>
              </div>
              <div className="flex items-center gap-3">
                <LogoMark size={24} className="opacity-30" />
                <span className="text-xs text-muted-foreground">Add effects or low contrast</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
