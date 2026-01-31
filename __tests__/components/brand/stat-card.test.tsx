import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard, StatCardMini } from '@/components/brand/stat-card'

// Mock the useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true), // Disable animation by default in tests
}))

describe('StatCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders label and value', () => {
    render(<StatCard label="Total Revenue" value={1000} />)

    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
  })

  it('formats currency with prefix', () => {
    render(<StatCard label="Revenue" value={5000} prefix="$" />)

    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('5,000')).toBeInTheDocument()
  })

  it('displays percentage with suffix', () => {
    render(<StatCard label="Growth" value={25} suffix="%" />)

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('formats decimals correctly', () => {
    render(<StatCard label="Average" value={123.456} decimals={2} />)

    expect(screen.getByText('123.46')).toBeInTheDocument()
  })

  it('shows up trend indicator', () => {
    render(<StatCard label="Revenue" value={100} trend="up" trendValue="+15%" />)

    expect(screen.getByText('+15%')).toBeInTheDocument()
  })

  it('shows down trend indicator', () => {
    render(<StatCard label="Costs" value={100} trend="down" trendValue="-10%" />)

    expect(screen.getByText('-10%')).toBeInTheDocument()
  })

  it('shows neutral trend indicator', () => {
    render(<StatCard label="Stable" value={100} trend="neutral" trendValue="0%" />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('displays secondary text', () => {
    render(<StatCard label="Total" value={100} secondaryText="vs last month" />)

    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    const customIcon = <span data-testid="custom-icon">icon</span>
    render(<StatCard label="Revenue" value={100} icon={customIcon} />)

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatCard label="Test" value={100} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('formats large numbers with locale', () => {
    render(<StatCard label="Total" value={1234567} />)

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
  })
})

describe('StatCardMini', () => {
  it('renders label and value', () => {
    render(<StatCardMini label="Count" value={50} />)

    expect(screen.getByText('Count')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('displays prefix', () => {
    render(<StatCardMini label="Total" value={100} prefix="$" />)

    expect(screen.getByText('$100')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatCardMini label="Test" value={100} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('formats numbers with locale', () => {
    render(<StatCardMini label="Total" value={12345} />)

    expect(screen.getByText('12,345')).toBeInTheDocument()
  })
})
