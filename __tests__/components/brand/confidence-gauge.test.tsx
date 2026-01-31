import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ConfidenceGauge,
  ConfidenceBar,
  ConfidenceThresholds,
} from '@/components/brand/confidence-gauge'

describe('ConfidenceGauge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays the confidence value', () => {
    render(<ConfidenceGauge value={85} animate={false} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('shows high confidence label for >= 90', () => {
    render(<ConfidenceGauge value={95} animate={false} />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('shows medium confidence label for 70-89', () => {
    render(<ConfidenceGauge value={80} animate={false} />)
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('shows low confidence label for < 70', () => {
    render(<ConfidenceGauge value={50} animate={false} />)
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<ConfidenceGauge value={85} animate={false} showLabel={false} />)
    expect(screen.queryByText('medium')).not.toBeInTheDocument()
  })

  it('applies small size', () => {
    const { container } = render(<ConfidenceGauge value={85} size="sm" animate={false} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '64')
  })

  it('applies medium size (default)', () => {
    const { container } = render(<ConfidenceGauge value={85} animate={false} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '96')
  })

  it('applies large size', () => {
    const { container } = render(<ConfidenceGauge value={85} size="lg" animate={false} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '128')
  })

  it('applies custom className', () => {
    const { container } = render(
      <ConfidenceGauge value={85} animate={false} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('uses green color for high confidence', () => {
    const { container } = render(<ConfidenceGauge value={95} animate={false} />)
    const circles = container.querySelectorAll('circle')
    expect(circles[1]).toHaveClass('stroke-emerald-500')
  })

  it('uses amber color for medium confidence', () => {
    const { container } = render(<ConfidenceGauge value={80} animate={false} />)
    const circles = container.querySelectorAll('circle')
    expect(circles[1]).toHaveClass('stroke-amber-500')
  })

  it('uses red color for low confidence', () => {
    const { container } = render(<ConfidenceGauge value={50} animate={false} />)
    const circles = container.querySelectorAll('circle')
    expect(circles[1]).toHaveClass('stroke-red-500')
  })
})

describe('ConfidenceBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays confidence value', () => {
    render(<ConfidenceBar value={75} animate={false} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows "Confidence" label', () => {
    render(<ConfidenceBar value={75} animate={false} />)
    expect(screen.getByText('Confidence')).toBeInTheDocument()
  })

  it('shows Auto-match for high confidence', () => {
    render(<ConfidenceBar value={95} animate={false} />)
    expect(screen.getByText('Auto-match')).toBeInTheDocument()
  })

  it('shows Review suggested for medium confidence', () => {
    render(<ConfidenceBar value={80} animate={false} />)
    expect(screen.getByText('Review suggested')).toBeInTheDocument()
  })

  it('shows Manual review for low confidence', () => {
    render(<ConfidenceBar value={50} animate={false} />)
    expect(screen.getByText('Manual review')).toBeInTheDocument()
  })

  it('hides value when showValue is false', () => {
    render(<ConfidenceBar value={75} animate={false} showValue={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
    expect(screen.queryByText('Confidence')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ConfidenceBar value={75} animate={false} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('ConfidenceThresholds', () => {
  it('displays all three threshold levels', () => {
    render(<ConfidenceThresholds />)

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('displays correct threshold values', () => {
    render(<ConfidenceThresholds />)

    expect(screen.getByText('≥90%')).toBeInTheDocument()
    expect(screen.getByText('70-89%')).toBeInTheDocument()
    expect(screen.getByText('<70%')).toBeInTheDocument()
  })

  it('displays color indicators', () => {
    const { container } = render(<ConfidenceThresholds />)

    const colorBoxes = container.querySelectorAll('.w-3.h-3')
    expect(colorBoxes).toHaveLength(3)
    expect(colorBoxes[0]).toHaveClass('bg-emerald-500')
    expect(colorBoxes[1]).toHaveClass('bg-amber-500')
    expect(colorBoxes[2]).toHaveClass('bg-red-500')
  })

  it('applies custom className', () => {
    const { container } = render(<ConfidenceThresholds className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
