import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/ui/modal'

describe('Modal', () => {
  it('renders when open and closes via button and escape', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes on outside click and restores body styles', () => {
    const onClose = vi.fn()

    const { rerender } = render(
      <Modal isOpen onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <Modal isOpen={false} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('')
  })
})
