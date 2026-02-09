import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Tooltip, InlineTooltip } from '@/components/ui/tooltip'

describe('Tooltip', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows tooltip on hover after delay', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      top: 0,
      left: 0,
      right: 100,
      bottom: 20,
      toJSON: () => '',
    } as DOMRect)

    render(
      <Tooltip content="Tooltip content" delay={50}>
        <button>Hover me</button>
      </Tooltip>
    )

    fireEvent.mouseEnter(screen.getByText('Hover me'))
    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip content')
    expect(screen.getByText('Hover me')).toHaveAttribute('aria-describedby')
  })

  it('does not show when disabled', () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Disabled tooltip" disabled>
        <button>Hover me</button>
      </Tooltip>
    )

    fireEvent.mouseEnter(screen.getByText('Hover me'))
    vi.advanceTimersByTime(200)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('InlineTooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render tooltip when not truncated', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)

    render(<InlineTooltip text="Short text" />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders tooltip when truncated', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      top: 0,
      left: 0,
      right: 100,
      bottom: 20,
      toJSON: () => '',
    } as DOMRect)

    render(<InlineTooltip text="This text is very long" />)

    fireEvent.mouseEnter(screen.getByText('This text is very long'))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByRole('tooltip')).toHaveTextContent('This text is very long')
  })
})
