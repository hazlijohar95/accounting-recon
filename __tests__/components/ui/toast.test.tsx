import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import {
  ToastProvider,
  ToastProviderWithGlobal,
  toast,
  useToast,
} from '@/components/ui/toast'

function Harness() {
  const { addToast, clearToasts } = useToast()
  return (
    <div>
      <button
        onClick={() =>
          addToast({
            type: 'success',
            title: 'Saved',
            description: 'All good',
            duration: 0,
          })
        }
      >
        Add
      </button>
      <button onClick={clearToasts}>Clear</button>
    </div>
  )
}

describe('ToastProvider', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('adds and clears a toast', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'toast-1' })

    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    )

    act(() => {
      fireEvent.click(screen.getByText('Add'))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Saved')

    act(() => {
      fireEvent.click(screen.getByText('Clear'))
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('handles toast action and dismiss', () => {
    vi.useFakeTimers()
    vi.stubGlobal('crypto', { randomUUID: () => 'toast-2' })
    const action = vi.fn()

    function ActionHarness() {
      const { addToast } = useToast()
      return (
        <button
          onClick={() =>
            addToast({
              type: 'info',
              title: 'Update',
              action: { label: 'Retry', onClick: action },
              duration: 0,
            })
          }
        >
          Add
        </button>
      )
    }

    render(
      <ToastProvider>
        <ActionHarness />
      </ToastProvider>
    )

    act(() => {
      fireEvent.click(screen.getByText('Add'))
    })
    act(() => {
      fireEvent.click(screen.getByText('Retry'))
    })

    expect(action).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveClass('animate-toast-out')
  })
})

describe('ToastProviderWithGlobal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders global toast events', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'toast-3' })

    render(
      <ToastProviderWithGlobal>
        <div>App</div>
      </ToastProviderWithGlobal>
    )

    act(() => {
      toast.success('Global', 'Notification')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Global')
  })
})
