import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  MatchLayerBadge,
  getMatchLayerLabel,
  getMatchLayerShortLabel,
} from '@/components/brand/match-layer-badge'

describe('MatchLayerBadge', () => {
  it('renders layer 1 (Exact) correctly', () => {
    render(<MatchLayerBadge layer={1} />)
    expect(screen.getByText('Exact')).toBeInTheDocument()
  })

  it('renders layer 2 (Window) correctly', () => {
    render(<MatchLayerBadge layer={2} />)
    expect(screen.getByText('Window')).toBeInTheDocument()
  })

  it('renders layer 3 (Ref) correctly', () => {
    render(<MatchLayerBadge layer={3} />)
    expect(screen.getByText('Ref')).toBeInTheDocument()
  })

  it('renders layer 4 (Fuzzy) correctly', () => {
    render(<MatchLayerBadge layer={4} />)
    expect(screen.getByText('Fuzzy')).toBeInTheDocument()
  })

  it('renders layer 5 (AI) with icon', () => {
    render(<MatchLayerBadge layer={5} />)
    expect(screen.getByText('AI')).toBeInTheDocument()
    // Should have Sparkles icon (SVG element)
    const badge = screen.getByText('AI').parentElement
    expect(badge?.querySelector('svg')).toBeInTheDocument()
  })

  it('renders layer 6 (Manual) correctly', () => {
    render(<MatchLayerBadge layer={6} />)
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('applies small size classes by default', () => {
    render(<MatchLayerBadge layer={1} />)
    const badge = screen.getByText('Exact')
    expect(badge).toHaveClass('px-1.5')
    expect(badge).toHaveClass('py-0.5')
  })

  it('applies medium size classes', () => {
    render(<MatchLayerBadge layer={1} size="md" />)
    const badge = screen.getByText('Exact')
    expect(badge).toHaveClass('px-2')
    expect(badge).toHaveClass('py-1')
  })

  it('applies custom className', () => {
    render(<MatchLayerBadge layer={1} className="custom-class" />)
    const badge = screen.getByText('Exact')
    expect(badge).toHaveClass('custom-class')
  })

  // Color tests
  it('has green color for layer 1', () => {
    render(<MatchLayerBadge layer={1} />)
    const badge = screen.getByText('Exact')
    expect(badge).toHaveClass('bg-emerald-500/15')
  })

  it('has amber color for layer 3', () => {
    render(<MatchLayerBadge layer={3} />)
    const badge = screen.getByText('Ref')
    expect(badge).toHaveClass('bg-amber-500/15')
  })

  it('has purple color for layer 5', () => {
    render(<MatchLayerBadge layer={5} />)
    const badge = screen.getByText('AI')
    expect(badge).toHaveClass('bg-purple-500/15')
  })

  it('has blue color for layer 6', () => {
    render(<MatchLayerBadge layer={6} />)
    const badge = screen.getByText('Manual')
    expect(badge).toHaveClass('bg-blue-500/15')
  })
})

describe('getMatchLayerLabel', () => {
  it('returns correct full labels', () => {
    expect(getMatchLayerLabel(1)).toBe('Exact Match')
    expect(getMatchLayerLabel(2)).toBe('Window Match')
    expect(getMatchLayerLabel(3)).toBe('Reference Match')
    expect(getMatchLayerLabel(4)).toBe('Fuzzy Match')
    expect(getMatchLayerLabel(5)).toBe('AI Semantic')
    expect(getMatchLayerLabel(6)).toBe('Manual Match')
  })

  it('returns fallback for unknown layers', () => {
    expect(getMatchLayerLabel(7)).toBe('Layer 7')
    expect(getMatchLayerLabel(99)).toBe('Layer 99')
  })
})

describe('getMatchLayerShortLabel', () => {
  it('returns correct short labels', () => {
    expect(getMatchLayerShortLabel(1)).toBe('Exact')
    expect(getMatchLayerShortLabel(2)).toBe('Window')
    expect(getMatchLayerShortLabel(3)).toBe('Ref')
    expect(getMatchLayerShortLabel(4)).toBe('Fuzzy')
    expect(getMatchLayerShortLabel(5)).toBe('AI')
    expect(getMatchLayerShortLabel(6)).toBe('Manual')
  })

  it('returns fallback for unknown layers', () => {
    expect(getMatchLayerShortLabel(7)).toBe('L7')
    expect(getMatchLayerShortLabel(99)).toBe('L99')
  })
})
