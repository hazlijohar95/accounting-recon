import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

describe('Popover', () => {
  it('renders content when open', () => {
    class ResizeObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    ;(globalThis as any).ResizeObserver = ResizeObserverMock

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    )

    expect(screen.getByText('Popover content')).toBeInTheDocument()
  })
})
