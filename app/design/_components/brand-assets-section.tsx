'use client'

import { cn } from '@/lib/utils'
import { Download, Copy, Check, ExternalLink } from 'lucide-react'
import { LogoMark } from '@/components/brand'
import { useCopyToClipboard } from '@/hooks'

interface AssetCardProps {
  name: string
  dimensions: string
  path: string
  preview: React.ReactNode
  downloadPath?: string
  svgCode?: string
}

function AssetCard({ name, dimensions, path, preview, downloadPath, svgCode }: AssetCardProps) {
  const { copied: pathCopied, copy: copyPath } = useCopyToClipboard()
  const { copied: codeCopied, copy: copyCode } = useCopyToClipboard()

  return (
    <div className="border border-border">
      <div className="aspect-video bg-muted flex items-center justify-center p-4">
        {preview}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{dimensions}</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-secondary px-2 py-1 truncate">{path}</code>
          <button
            onClick={() => copyPath(path)}
            className="text-xs px-2 py-1 border border-border hover:bg-secondary transition-colors"
            title="Copy path"
          >
            {pathCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <div className="flex gap-2">
          {downloadPath && (
            <a
              href={downloadPath}
              download
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-foreground text-background text-xs hover:bg-foreground/90 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          )}
          {svgCode && (
            <button
              onClick={() => copyCode(svgCode)}
              className="px-3 py-2 border border-border text-xs hover:bg-secondary transition-colors"
              title="Copy SVG code"
            >
              {codeCopied ? 'Copied!' : 'Copy SVG'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const logoSvgCode = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="8" height="32" fill="currentColor"/>
  <rect x="16" y="8" width="16" height="8" fill="currentColor"/>
  <rect x="32" y="8" width="8" height="12" fill="currentColor"/>
  <rect x="16" y="20" width="16" height="8" fill="currentColor"/>
  <rect x="24" y="28" width="8" height="4" fill="currentColor"/>
  <rect x="32" y="32" width="8" height="8" fill="currentColor"/>
</svg>`

export function BrandAssetsSection() {
  return (
    <section id="brand-assets" className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Brand Assets</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Downloadable brand assets for web, social media, and marketing materials.
        </p>
      </div>

      {/* Logos */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Logos
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <AssetCard
            name="Logo (Dark Theme)"
            dimensions="48x48"
            path="/brand/logos/logo-dark.svg"
            downloadPath="/brand/logos/logo-dark.svg"
            svgCode={logoSvgCode}
            preview={
              <div className="bg-[#0a0a0a] p-4">
                <LogoMark size={48} className="text-[#fafafa]" />
              </div>
            }
          />
          <AssetCard
            name="Logo (Light Theme)"
            dimensions="48x48"
            path="/brand/logos/logo-light.svg"
            downloadPath="/brand/logos/logo-light.svg"
            svgCode={logoSvgCode}
            preview={
              <div className="bg-[#fafafa] p-4">
                <LogoMark size={48} className="text-[#0a0a0a]" />
              </div>
            }
          />
          <AssetCard
            name="Logo with Text (Dark)"
            dimensions="180x48"
            path="/brand/logos/logo-with-text-dark.svg"
            downloadPath="/brand/logos/logo-with-text-dark.svg"
            preview={
              <div className="bg-[#0a0a0a] p-4 flex items-center gap-3">
                <LogoMark size={32} className="text-[#fafafa]" />
                <span className="font-mono text-sm text-[#fafafa]">reconcile</span>
              </div>
            }
          />
          <AssetCard
            name="Logo with Text (Light)"
            dimensions="180x48"
            path="/brand/logos/logo-with-text-light.svg"
            downloadPath="/brand/logos/logo-with-text-light.svg"
            preview={
              <div className="bg-[#fafafa] p-4 flex items-center gap-3">
                <LogoMark size={32} className="text-[#0a0a0a]" />
                <span className="font-mono text-sm text-[#0a0a0a]">reconcile</span>
              </div>
            }
          />
        </div>
      </div>

      {/* Favicons */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Favicons & Icons
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <AssetCard
            name="Favicon SVG"
            dimensions="32x32"
            path="/brand/icons/favicon.svg"
            downloadPath="/brand/icons/favicon.svg"
            preview={
              <div className="w-8 h-8 bg-foreground flex items-center justify-center">
                <LogoMark size={24} className="text-background" />
              </div>
            }
          />
          <AssetCard
            name="Original Favicon"
            dimensions="Scalable"
            path="/favicon.svg"
            downloadPath="/favicon.svg"
            preview={
              <div className="w-8 h-8 bg-foreground flex items-center justify-center">
                <LogoMark size={24} className="text-background" />
              </div>
            }
          />
          <div className="border border-border p-4 flex flex-col items-center justify-center text-center">
            <div className="flex gap-2 items-end mb-4">
              <div className="w-4 h-4 bg-foreground" />
              <div className="w-6 h-6 bg-foreground" />
              <div className="w-8 h-8 bg-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">
              PNG exports require image conversion.
              <br />Use sharp or online tools.
            </span>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Social Media Templates
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <AssetCard
            name="OG Image Template"
            dimensions="1200x630"
            path="/brand/social/og-template.svg"
            downloadPath="/brand/social/og-template.svg"
            preview={
              <div className="w-full aspect-[1200/630] bg-[#0a0a0a] flex flex-col items-center justify-center gap-2 p-4 relative">
                <LogoMark size={32} className="text-[#fafafa]" />
                <span className="font-mono text-[10px] text-[#fafafa]/70">reconcile</span>
                <span className="text-[8px] text-[#fafafa]/40">Change the way you reconcile.</span>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fafafa]" />
              </div>
            }
          />
          <AssetCard
            name="Twitter Card Template"
            dimensions="1200x600"
            path="/brand/social/twitter-template.svg"
            downloadPath="/brand/social/twitter-template.svg"
            preview={
              <div className="w-full aspect-[1200/600] bg-[#0a0a0a] flex items-center justify-center gap-4 p-4 relative">
                <LogoMark size={24} className="text-[#fafafa]" />
                <span className="font-mono text-xs text-[#fafafa]">reconcile</span>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fafafa]" />
              </div>
            }
          />
        </div>
      </div>

      {/* Banners */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Banners
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <AssetCard
            name="Banner Template"
            dimensions="1920x480"
            path="/brand/social/banner.svg"
            downloadPath="/brand/social/banner.svg"
            preview={
              <div className="w-full aspect-[1920/480] bg-[#0a0a0a] flex items-center justify-between px-8 relative">
                <div className="flex items-center gap-3">
                  <LogoMark size={24} className="text-[#fafafa]" />
                  <span className="font-mono text-xs text-[#fafafa]">reconcile</span>
                </div>
                <span className="text-[8px] text-[#fafafa]/50 font-mono">
                  Change the way you reconcile.
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fafafa]" />
              </div>
            }
          />
        </div>
      </div>

      {/* Quick Reference */}
      <div className="border border-border p-6 bg-secondary/30">
        <h3 className="text-sm font-medium mb-4">Quick Reference</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Asset Locations
            </h4>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logos:</span>
                <span>/brand/logos/</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Icons:</span>
                <span>/brand/icons/</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Social:</span>
                <span>/brand/social/</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Recommended Sizes
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">OG Image:</span>
                <span>1200×630px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Twitter:</span>
                <span>1200×600px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Favicon:</span>
                <span>32×32px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Instructions */}
      <div className="border border-border p-6">
        <h3 className="text-sm font-medium mb-2">Converting to PNG</h3>
        <p className="text-xs text-muted-foreground mb-4">
          SVG templates can be converted to PNG using various tools:
        </p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-medium">Browser Method</span>
            <p className="text-muted-foreground">
              Open SVG, right-click, "Save as Image"
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-medium">CLI (sharp)</span>
            <p className="text-muted-foreground font-mono">
              sharp input.svg -o output.png
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-medium">Online Tools</span>
            <p className="text-muted-foreground">
              CloudConvert, SVGtoPNG.com
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
