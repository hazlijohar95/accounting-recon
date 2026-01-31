'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'logo', label: 'Logo' },
  { id: 'brand', label: 'Brand' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'ai-features', label: 'AI Features' },
  { id: 'components', label: 'Components' },
  { id: 'brand-assets', label: 'Brand Assets' },
  { id: 'animations', label: 'Animations' },
  { id: '3d-logo', label: '3D Logo' },
  { id: 'launch-video', label: 'Launch Video' },
  { id: 'marketing', label: 'Marketing' },
]

export function DesignNav() {
  const [activeSection, setActiveSection] = useState('logo')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    )

    sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="w-48 shrink-0 sticky top-0 h-screen border-r border-border bg-background">
      <div className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
          Sections
        </div>
        <ul className="space-y-1">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => scrollToSection(id)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  activeSection === id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
