'use client'

import dynamic from 'next/dynamic'
import { LogoMark } from '@/components/brand'
import { DemoCard } from './demo-card'
import { CodeBlock } from './code-block'

// Dynamic imports for 3D components (no SSR)
const Logo3DHero = dynamic(
  () => import('@/components/brand/3d/logo-3d-hero').then((mod) => mod.Logo3DHero),
  { ssr: false, loading: () => <Logo3DPlaceholder /> }
)

const Logo3DLoading = dynamic(
  () => import('@/components/brand/3d/logo-3d-loading').then((mod) => mod.Logo3DLoading),
  { ssr: false, loading: () => <Logo3DPlaceholder size={200} /> }
)

const Logo3DMarketing = dynamic(
  () => import('@/components/brand/3d/logo-3d-marketing').then((mod) => mod.Logo3DMarketing),
  { ssr: false, loading: () => <Logo3DPlaceholder /> }
)

const Logo3DShowcase = dynamic(
  () => import('@/components/brand/3d/logo-3d-showcase').then((mod) => mod.Logo3DShowcase),
  { ssr: false, loading: () => <Logo3DPlaceholder /> }
)

function Logo3DPlaceholder({ size = 300 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-muted/20 animate-pulse"
      style={{ width: size, height: size }}
    >
      <LogoMark size={size * 0.4} className="text-muted-foreground/30" />
    </div>
  )
}

export function Logo3DSection() {

  return (
    <section id="3d-logo" className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">3D Logo Components</h2>
        <p className="text-sm text-muted-foreground mt-2">
          WebGL-powered 3D variants of the geometric &ldquo;R&rdquo; logo using React Three Fiber.
          Includes performance optimizations for mobile and accessibility fallbacks.
        </p>
      </div>

      {/* Technical Overview */}
      <div className="border border-border p-6 space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Technical Stack
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Rendering</div>
            <div className="text-sm font-mono">Three.js</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Integration</div>
            <div className="text-sm font-mono">R3F + Drei</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Geometry</div>
            <div className="text-sm font-mono">6 BoxGeometry</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fallback</div>
            <div className="text-sm font-mono">SVG 2D</div>
          </div>
        </div>
      </div>

      {/* Hero Variant */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Hero Variant
        </h3>
        <p className="text-xs text-muted-foreground">
          For landing page heroes. Features entrance animation, subtle idle rotation, and mouse-follow tilt.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <DemoCard variant="3d"
            title="Logo3DHero"
            description="Staggered entrance (80ms delay per rectangle), gentle Y-axis rotation, mouse tilt"
          >
            <Logo3DHero size={300} color="#737373" />
          </DemoCard>
          <div className="border border-border p-4 space-y-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usage
            </h4>
            <CodeBlock
              code={`import { Logo3DHero } from '@/components/brand/3d'

<Logo3DHero
  size={400}
  color="#737373"
/>`}
            />
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Props
            </h4>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 font-mono">size</td>
                  <td className="py-2 text-muted-foreground">Canvas dimensions (default: 400)</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono">color</td>
                  <td className="py-2 text-muted-foreground">Hex color (default: #737373)</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono">className</td>
                  <td className="py-2 text-muted-foreground">Additional CSS classes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Loading Variant */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Loading Variant
        </h3>
        <p className="text-xs text-muted-foreground">
          Assembly animation for loading states. Rectangles fly in from random positions, settle with spring physics, then pulse.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <DemoCard variant="3d"
            title="Logo3DLoading"
            description="2.5s loop: fly-in → settle → hold → pulse"
          >
            <Logo3DLoading size={180} />
          </DemoCard>
          <DemoCard variant="3d"
            title="Small Size"
            description="Lightweight 100px variant for inline use"
          >
            <Logo3DLoading size={100} />
          </DemoCard>
          <div className="border border-border p-4 space-y-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usage
            </h4>
            <CodeBlock
              code={`import { Logo3DLoading } from '@/components/brand/3d'

<Logo3DLoading
  size={200}
  color="#737373"
/>`}
            />
            <div className="text-xs text-muted-foreground space-y-2">
              <p><strong>Animation sequence:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>0-800ms: Fly-in from random positions</li>
                <li>800-1500ms: Settle with spring physics</li>
                <li>1500-2000ms: Hold assembled position</li>
                <li>2000-2500ms: Pulse with glow effect</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Variant */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Marketing Variant
        </h3>
        <p className="text-xs text-muted-foreground">
          Exploded/floating view for marketing materials. Rectangles float at different depths with oscillation and scroll parallax.
        </p>
        <DemoCard variant="3d"
          title="Logo3DMarketing"
          description="Floating oscillation, scroll parallax, configurable explode factor"
          className="col-span-full"
        >
          <Logo3DMarketing width={600} height={300} explode={0.6} />
        </DemoCard>
        <div className="border border-border p-4">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Props
          </h4>
          <CodeBlock
            code={`<Logo3DMarketing
  width="100%"    // Canvas width (default: '100%')
  height={400}    // Canvas height (default: 400)
  color="#737373" // Hex color
  explode={0.5}   // 0 = assembled, 1 = fully exploded
  enableParallax={true}  // Scroll parallax
/>`}
          />
        </div>
      </div>

      {/* Interactive Showcase */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Interactive Showcase
        </h3>
        <p className="text-xs text-muted-foreground">
          Full interactive controls with OrbitControls, auto-rotate toggle, and explode/assemble animation.
        </p>
        <div className="border border-border">
          <div className="bg-muted/20 p-8">
            <Logo3DShowcase height={350} showControls />
          </div>
          <div className="p-4 border-t border-border">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Controls
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Drag:</strong> Rotate the camera around the logo</li>
              <li>• <strong>Scroll:</strong> Zoom in/out (1.5x to 5x range)</li>
              <li>• <strong>Rotate:</strong> Toggle auto-rotation</li>
              <li>• <strong>Explode:</strong> Toggle exploded view animation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Performance Notes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Performance & Accessibility
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border p-4 space-y-2">
            <h4 className="text-xs font-medium">Mobile Optimizations</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Disabled antialiasing</li>
              <li>• pixelRatio capped at 1</li>
              <li>• Disabled mouse interaction</li>
              <li>• Reduced geometry complexity</li>
            </ul>
          </div>
          <div className="border border-border p-4 space-y-2">
            <h4 className="text-xs font-medium">Accessibility Fallbacks</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Reduced motion: Static SVG logo</li>
              <li>• No WebGL: 2D animated variant</li>
              <li>• Screen readers: Hidden decorative canvas</li>
            </ul>
          </div>
        </div>
        <div className="border border-border p-4">
          <h4 className="text-xs font-medium mb-2">Dynamic Import Pattern</h4>
          <CodeBlock
            code={`// Lazy load for better initial page performance
const Logo3DHero = dynamic(
  () => import('@/components/brand/3d').then(mod => mod.Logo3DHero),
  { ssr: false, loading: () => <LogoAnimated /> }
)`}
          />
        </div>
      </div>

      {/* Hooks Reference */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Related Hooks
        </h3>
        <div className="border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Hook</th>
                <th className="px-4 py-2 text-left font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">useIsMobile()</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Detects viewport &lt;768px for mobile optimizations
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">useReducedMotion()</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Detects prefers-reduced-motion for static fallbacks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
