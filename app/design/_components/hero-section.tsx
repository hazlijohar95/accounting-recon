'use client'

import { useState, useEffect } from 'react'
import { IconCaretDown } from '@/components/brand/icons'
import { LogoAnimated } from '@/components/brand'
import { cn } from '@/lib/utils'

export function HeroSection() {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Show tagline after logo animation completes (~500ms for last rectangle)
    const timer = setTimeout(() => setShowContent(true), 600)
    return () => clearTimeout(timer)
  }, [])

  const scrollToContent = () => {
    document.getElementById('logo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center relative">
      {/* Animated logo - large and centered */}
      <LogoAnimated size={120} className="mb-8" />

      {/* Tagline fades in after logo animation */}
      <div
        className={cn(
          'text-center transition-all duration-700',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        <h1 className="font-mono text-2xl tracking-wide mb-2">reconcile.</h1>
        <p className="text-muted-foreground text-sm">
          Change the way you reconcile.
        </p>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToContent}
        className={cn(
          'absolute bottom-8 flex flex-col items-center gap-2 text-muted-foreground',
          'hover:text-foreground transition-colors cursor-pointer',
          'transition-opacity duration-500',
          showContent ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span className="text-xs uppercase tracking-wider">Explore</span>
        <IconCaretDown size={16} className="animate-bounce" />
      </button>
    </section>
  )
}
