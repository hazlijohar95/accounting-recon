import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  BulkApproveDialog,
  ConfirmationDialog,
  DeleteConfirmationDialog,
  useConfirmation,
} from '@/components/ui/confirmation-dialog'

describe('ConfirmationDialog', () => {
  it('renders destructive dialog with item count and details', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(
      <ConfirmationDialog
        isOpen
        title="Delete Items"
        message="Are you sure?"
        itemCount={12}
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
        details={Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`)}
      />
    )

    expect(screen.getByText('Delete Items')).toBeInTheDocument()
    expect(screen.getByText((text) => text.startsWith('This will affect'))).toBeInTheDocument()
    expect(screen.getByText('...and 2 more')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('handles confirm success and error', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(undefined)

    render(
      <ConfirmationDialog
        isOpen
        title="Confirm"
        message="Proceed?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Failed')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders preset dialogs', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    const { rerender } = render(
      <DeleteConfirmationDialog
        isOpen
        itemName="file"
        itemCount={2}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText('Delete 2 files?')).toBeInTheDocument()

    rerender(
      <BulkApproveDialog
        isOpen
        count={3}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText('Approve 3 Matches?')).toBeInTheDocument()
  })
})

describe('useConfirmation', () => {
  it('opens and closes with data', () => {
    function TestHarness() {
      const state = useConfirmation<string>()
      return (
        <div>
          <button onClick={() => state.open('item-1')}>Open</button>
          <button onClick={() => state.close()}>Close</button>
          <span data-testid="state">{state.isOpen ? state.data : 'closed'}</span>
        </div>
      )
    }

    render(<TestHarness />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByTestId('state')).toHaveTextContent('item-1')
  })
})
