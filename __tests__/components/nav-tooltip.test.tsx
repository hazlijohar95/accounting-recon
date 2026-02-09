import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { NavTooltip } from '@/components/nav-tooltip'

describe('NavTooltip', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows tooltip on hover after delay', () => {
    vi.useFakeTimers()
    render(
      <NavTooltip label="Settings" show>
        <button>Icon</button>
      </NavTooltip>
    )

    fireEvent.mouseEnter(screen.getByText('Icon'))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByRole('tooltip')).toHaveTextContent('Settings')
  })

  it('does not show tooltip when disabled', () => {
    vi.useFakeTimers()
    render(
      <NavTooltip label="Settings" show={false}>
        <button>Icon</button>
      </NavTooltip>
    )

    fireEvent.mouseEnter(screen.getByText('Icon'))
    vi.advanceTimersByTime(200)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
