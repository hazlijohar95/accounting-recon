'use client'

import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/brand'

function GridPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn('absolute inset-0 opacity-5', className)}
      style={{
        backgroundImage: `
          linear-gradient(to right, currentColor 1px, transparent 1px),
          linear-gradient(to bottom, currentColor 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    />
  )
}

interface MarketingAssetProps {
  title: string
  dimensions: string
  children: React.ReactNode
  className?: string
}

function MarketingAsset({ title, dimensions, children, className }: MarketingAssetProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{dimensions}</span>
      </div>
      <div
        className={cn('border border-border overflow-hidden', className)}
      >
        {children}
      </div>
      <p className="text-xs text-muted-foreground">
        Right-click → Save image as PNG, or use browser screenshot tools for full resolution.
      </p>
    </div>
  )
}

export function MarketingSection() {
  return (
    <section id="marketing" className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Marketing</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Marketing-ready components for social media and promotional materials.
          These previews can be exported as images.
        </p>
      </div>

      {/* Taglines */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Taglines
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="border border-border p-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Primary</span>
                <p className="text-lg font-mono mt-1">reconcile.</p>
                <p className="text-sm text-muted-foreground">Change the way you reconcile.</p>
              </div>
              <div className="border-t border-border pt-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Variations</span>
                <ul className="mt-2 space-y-2 text-sm">
                  <li><span className="font-mono">Reconciled.</span> <span className="text-muted-foreground">— implies the problem is solved</span></li>
                  <li><span className="font-mono">Finally reconciled.</span> <span className="text-muted-foreground">— adds relief/satisfaction</span></li>
                  <li><span className="font-mono">Numbers that agree.</span> <span className="text-muted-foreground">— descriptive alternative</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OG Image */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Open Graph Image
        </h3>
        <MarketingAsset title="og-image.png" dimensions="1200 × 630">
          <div
            className="relative w-full bg-[#0a0a0a] text-[#fafafa] flex flex-col items-center justify-center gap-6 p-12"
            style={{ aspectRatio: '1200 / 630' }}
          >
            <GridPattern />
            <LogoMark size={96} />
            <div className="text-center z-10">
              <p className="font-mono text-2xl tracking-wide">reconcile.</p>
              <p className="text-sm text-[#fafafa]/60 mt-2">Change the way you reconcile.</p>
            </div>
          </div>
        </MarketingAsset>
      </div>

      {/* Twitter Card */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Twitter Card
        </h3>
        <MarketingAsset title="twitter-card.png" dimensions="1200 × 600">
          <div
            className="relative w-full bg-[#0a0a0a] text-[#fafafa] flex items-center justify-center gap-8 p-12"
            style={{ aspectRatio: '1200 / 600' }}
          >
            <GridPattern />
            <LogoMark size={72} />
            <div className="z-10">
              <p className="font-mono text-xl tracking-wide">reconcile.</p>
              <p className="text-xs text-[#fafafa]/60 mt-1">Numbers that agree.</p>
            </div>
          </div>
        </MarketingAsset>
      </div>

      {/* Banner */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Banner
        </h3>
        <MarketingAsset title="banner.png" dimensions="1920 × 480">
          <div
            className="relative w-full bg-[#0a0a0a] text-[#fafafa] flex items-center justify-between px-16 py-8"
            style={{ aspectRatio: '1920 / 480' }}
          >
            <GridPattern />
            <div className="flex items-center gap-6 z-10">
              <LogoMark size={56} />
              <div>
                <p className="font-mono text-lg tracking-wide">reconcile.</p>
                <p className="text-xs text-[#fafafa]/50">Automated cash-accrual reconciliation</p>
              </div>
            </div>
            <p className="font-mono text-sm text-[#fafafa]/40 z-10">
              Change the way you reconcile.
            </p>
          </div>
        </MarketingAsset>
      </div>

      {/* Instagram Poster */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Instagram Poster
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <MarketingAsset title="poster-dark.png" dimensions="1080 × 1350">
            <div
              className="relative w-full bg-[#0a0a0a] text-[#fafafa] flex flex-col items-center justify-center gap-8 p-12"
              style={{ aspectRatio: '1080 / 1350' }}
            >
              <GridPattern />
              <LogoMark size={120} />
              <div className="text-center z-10 space-y-4">
                <p className="font-mono text-3xl tracking-wide">reconcile.</p>
                <div className="space-y-2 text-xs text-[#fafafa]/50 font-mono">
                  <p>□ Automated matching</p>
                  <p>□ 5-layer AI engine</p>
                  <p>□ Real-time sync</p>
                  <p>□ Bank statements → Invoices</p>
                </div>
              </div>
              <p className="absolute bottom-8 text-xs text-[#fafafa]/30 font-mono">
                reconcile.app
              </p>
            </div>
          </MarketingAsset>
          <MarketingAsset title="poster-light.png" dimensions="1080 × 1350">
            <div
              className="relative w-full bg-[#fafafa] text-[#0a0a0a] flex flex-col items-center justify-center gap-8 p-12"
              style={{ aspectRatio: '1080 / 1350' }}
            >
              <GridPattern />
              <LogoMark size={120} />
              <div className="text-center z-10 space-y-4">
                <p className="font-mono text-3xl tracking-wide">reconcile.</p>
                <div className="space-y-2 text-xs text-[#0a0a0a]/50 font-mono">
                  <p>□ Automated matching</p>
                  <p>□ 5-layer AI engine</p>
                  <p>□ Real-time sync</p>
                  <p>□ Bank statements → Invoices</p>
                </div>
              </div>
              <p className="absolute bottom-8 text-xs text-[#0a0a0a]/30 font-mono">
                reconcile.app
              </p>
            </div>
          </MarketingAsset>
        </div>
      </div>

      {/* Feature Highlight Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Feature Highlights
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: '5-Layer Matching', desc: 'Exact → Window → Reference → Fuzzy → LLM' },
            { title: 'Real-time Sync', desc: 'Bank feeds updated automatically' },
            { title: 'Smart Categorization', desc: 'AI-powered account mapping' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="border border-border bg-[#0a0a0a] text-[#fafafa] p-6"
              style={{ aspectRatio: '1 / 1' }}
            >
              <div className="h-full flex flex-col justify-between">
                <LogoMark size={32} />
                <div>
                  <p className="font-mono text-sm">{feature.title}</p>
                  <p className="text-xs text-[#fafafa]/50 mt-1">{feature.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Instructions */}
      <div className="border border-border p-6 bg-secondary/30">
        <h3 className="text-sm font-medium mb-2">Exporting Assets</h3>
        <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Right-click on any preview above and select "Save image as..."</li>
          <li>For higher resolution, use browser DevTools to set device pixel ratio</li>
          <li>Alternatively, use screenshot tools like CleanShot X or Shottr</li>
          <li>For programmatic export, render components with html-to-image library</li>
        </ol>
      </div>
    </section>
  )
}
