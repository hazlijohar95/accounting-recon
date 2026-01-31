'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ColorSwatchProps {
  name: string
  variable: string
  lightValue: string
  darkValue: string
}

function ColorSwatch({ name, variable, lightValue, darkValue }: ColorSwatchProps) {
  const [copied, setCopied] = useState<'light' | 'dark' | null>(null)

  const handleCopy = async (value: string, mode: 'light' | 'dark') => {
    await navigator.clipboard.writeText(value)
    setCopied(mode)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div
      className={cn(
        'border transition-colors duration-200',
        copied ? 'border-emerald-500' : 'border-border'
      )}
    >
      <div className="grid grid-cols-2">
        <button
          onClick={() => handleCopy(lightValue, 'light')}
          className="h-16 relative group cursor-copy"
          style={{ backgroundColor: lightValue }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
            {copied === 'light' ? (
              <Check className="w-4 h-4 text-white drop-shadow" />
            ) : (
              <Copy className="w-4 h-4 text-white drop-shadow" />
            )}
          </div>
        </button>
        <button
          onClick={() => handleCopy(darkValue, 'dark')}
          className="h-16 relative group cursor-copy"
          style={{ backgroundColor: darkValue }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10">
            {copied === 'dark' ? (
              <Check className="w-4 h-4 text-white drop-shadow" />
            ) : (
              <Copy className="w-4 h-4 text-white drop-shadow" />
            )}
          </div>
        </button>
      </div>
      <div className="p-3 bg-background">
        <div className="text-xs font-medium">{name}</div>
        <div className="text-[10px] text-muted-foreground font-mono mt-1">{variable}</div>
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-2">
          <span>{lightValue}</span>
          <span>{darkValue}</span>
        </div>
      </div>
    </div>
  )
}

const coreColors: ColorSwatchProps[] = [
  { name: 'Background', variable: '--background', lightValue: '#ffffff', darkValue: '#0a0a0a' },
  { name: 'Foreground', variable: '--foreground', lightValue: '#0a0a0a', darkValue: '#fafafa' },
  { name: 'Card', variable: '--card', lightValue: '#ffffff', darkValue: '#191919' },
  { name: 'Card Foreground', variable: '--card-foreground', lightValue: '#0a0a0a', darkValue: '#fafafa' },
  { name: 'Popover', variable: '--popover', lightValue: '#ffffff', darkValue: '#262626' },
  { name: 'Popover Foreground', variable: '--popover-foreground', lightValue: '#0a0a0a', darkValue: '#fafafa' },
]

const surfaceColors: ColorSwatchProps[] = [
  { name: 'Primary', variable: '--primary', lightValue: '#737373', darkValue: '#737373' },
  { name: 'Primary Foreground', variable: '--primary-foreground', lightValue: '#fafafa', darkValue: '#fafafa' },
  { name: 'Secondary', variable: '--secondary', lightValue: '#f5f5f5', darkValue: '#262626' },
  { name: 'Secondary Foreground', variable: '--secondary-foreground', lightValue: '#171717', darkValue: '#fafafa' },
  { name: 'Muted', variable: '--muted', lightValue: '#f5f5f5', darkValue: '#262626' },
  { name: 'Muted Foreground', variable: '--muted-foreground', lightValue: '#717171', darkValue: '#a1a1a1' },
  { name: 'Accent', variable: '--accent', lightValue: '#f5f5f5', darkValue: '#404040' },
  { name: 'Accent Foreground', variable: '--accent-foreground', lightValue: '#171717', darkValue: '#fafafa' },
]

const interactiveColors: ColorSwatchProps[] = [
  { name: 'Destructive', variable: '--destructive', lightValue: '#e7000b', darkValue: '#ff6467' },
  { name: 'Destructive Foreground', variable: '--destructive-foreground', lightValue: '#f5f5f5', darkValue: '#262626' },
  { name: 'Border', variable: '--border', lightValue: '#e5e5e5', darkValue: '#383838' },
  { name: 'Input', variable: '--input', lightValue: '#e5e5e5', darkValue: '#525252' },
  { name: 'Ring', variable: '--ring', lightValue: '#a1a1a1', darkValue: '#737373' },
]

const sidebarColors: ColorSwatchProps[] = [
  { name: 'Sidebar', variable: '--sidebar', lightValue: '#fafafa', darkValue: '#171717' },
  { name: 'Sidebar Foreground', variable: '--sidebar-foreground', lightValue: '#0a0a0a', darkValue: '#fafafa' },
  { name: 'Sidebar Primary', variable: '--sidebar-primary', lightValue: '#171717', darkValue: '#fafafa' },
  { name: 'Sidebar Accent', variable: '--sidebar-accent', lightValue: '#f5f5f5', darkValue: '#262626' },
  { name: 'Sidebar Border', variable: '--sidebar-border', lightValue: '#e5e5e5', darkValue: '#ffffff' },
]

const typeSizes = [
  { name: 'text-3xl', size: '1.875rem', lineHeight: '2.25rem' },
  { name: 'text-2xl', size: '1.5rem', lineHeight: '2rem' },
  { name: 'text-xl', size: '1.25rem', lineHeight: '1.75rem' },
  { name: 'text-lg', size: '1.125rem', lineHeight: '1.75rem' },
  { name: 'text-base', size: '1rem', lineHeight: '1.5rem' },
  { name: 'text-sm', size: '0.875rem', lineHeight: '1.25rem' },
  { name: 'text-xs', size: '0.75rem', lineHeight: '1rem' },
]

export function BrandSection() {
  return (
    <section id="brand" className="space-y-12">
      <div>
        <h2 className="text-xl font-medium">Brand</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Colors and typography that define the Reconcile visual identity.
        </p>
      </div>

      {/* Colors */}
      <div className="space-y-8">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Colors
        </h3>

        <div className="border border-border p-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-border" />
              Light Mode
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#0a0a0a]" />
              Dark Mode
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Click any swatch to copy hex value</p>
        </div>

        {/* Core Colors */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Core</h4>
          <div className="grid grid-cols-6 gap-3">
            {coreColors.map((color) => (
              <ColorSwatch key={color.variable} {...color} />
            ))}
          </div>
        </div>

        {/* Surface Colors */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Surface</h4>
          <div className="grid grid-cols-4 gap-3">
            {surfaceColors.map((color) => (
              <ColorSwatch key={color.variable} {...color} />
            ))}
          </div>
        </div>

        {/* Interactive Colors */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Interactive</h4>
          <div className="grid grid-cols-5 gap-3">
            {interactiveColors.map((color) => (
              <ColorSwatch key={color.variable} {...color} />
            ))}
          </div>
        </div>

        {/* Sidebar Colors */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Sidebar</h4>
          <div className="grid grid-cols-5 gap-3">
            {sidebarColors.map((color) => (
              <ColorSwatch key={color.variable} {...color} />
            ))}
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-8">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Typography
        </h3>

        {/* Font Family */}
        <div className="border border-border p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-normal">Inter</span>
            <span className="text-xs text-muted-foreground font-mono">font-sans</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Inter is our primary typeface, chosen for its excellent legibility at small sizes and geometric construction that matches our sharp aesthetic.
          </p>
          <div className="text-sm mt-4">
            ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
            abcdefghijklmnopqrstuvwxyz<br />
            0123456789
          </div>
        </div>

        {/* Type Scale */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Type Scale</h4>
          <div className="border border-border divide-y divide-border">
            {typeSizes.map(({ name, size, lineHeight }) => (
              <div key={name} className="flex items-center justify-between p-4">
                <span className={cn(name)}>The quick brown fox</span>
                <div className="text-xs text-muted-foreground font-mono flex gap-4">
                  <span>{name}</span>
                  <span>{size}</span>
                  <span>/{lineHeight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Font Weights */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Font Weights</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border p-4">
              <div className="text-lg font-normal">Regular (400)</div>
              <div className="text-xs text-muted-foreground font-mono mt-2">font-normal</div>
              <p className="text-sm mt-3">Used for body text and general content.</p>
            </div>
            <div className="border border-border p-4">
              <div className="text-lg font-medium">Medium (500)</div>
              <div className="text-xs text-muted-foreground font-mono mt-2">font-medium</div>
              <p className="text-sm mt-3">Used for headings, labels, and emphasis.</p>
            </div>
          </div>
        </div>

        {/* Special Treatments */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Special Treatments</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Uppercase Label
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-3">
                text-xs uppercase tracking-wider
              </div>
              <p className="text-sm mt-3">Used for section labels, category names, and metadata.</p>
            </div>
            <div className="border border-border p-4">
              <div className="font-mono text-sm">Monospace</div>
              <div className="text-xs text-muted-foreground font-mono mt-3">
                font-mono
              </div>
              <p className="text-sm mt-3">Used for code, technical values, and data.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
