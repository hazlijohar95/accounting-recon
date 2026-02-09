/**
 * Tests for UniverSheetError component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniverSheetError } from '@/components/spreadsheet/univer-sheet-error'

describe('UniverSheetError', () => {
  it('renders error title', () => {
    render(<UniverSheetError />)
    expect(screen.getByText('Failed to load spreadsheet')).toBeInTheDocument()
  })

  it('displays custom error message', () => {
    const error = new Error('Custom error message')
    render(<UniverSheetError error={error} />)
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  it('displays default message when no error provided', () => {
    render(<UniverSheetError />)
    expect(screen.getByText(/An unexpected error occurred while loading the spreadsheet/)).toBeInTheDocument()
  })

  it('displays default message when error is null', () => {
    render(<UniverSheetError error={null} />)
    expect(screen.getByText(/An unexpected error occurred while loading the spreadsheet/)).toBeInTheDocument()
  })

  it('calls onRetry when button clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<UniverSheetError onRetry={onRetry} />)

    await user.click(screen.getByText('Try Again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('hides retry button when onRetry not provided', () => {
    render(<UniverSheetError />)
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })

  it('shows retry button when onRetry is provided', () => {
    render(<UniverSheetError onRetry={() => {}} />)
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('applies custom height as string', () => {
    const { container } = render(<UniverSheetError height="400px" />)
    expect(container.firstChild).toHaveStyle({ height: '400px' })
  })

  it('applies custom height as number', () => {
    const { container } = render(<UniverSheetError height={500} />)
    expect(container.firstChild).toHaveStyle({ height: '500px' })
  })

  it('uses default height when not specified', () => {
    const { container } = render(<UniverSheetError />)
    expect(container.firstChild).toHaveStyle({ height: '600px' })
  })

  it('applies custom className', () => {
    const { container } = render(<UniverSheetError className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has proper accessibility role', () => {
    render(<UniverSheetError />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('has aria-live attribute for accessibility', () => {
    render(<UniverSheetError />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })

  it('renders error icon', () => {
    const { container } = render(<UniverSheetError />)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('w-12', 'h-12')
  })

  it('renders help text', () => {
    render(<UniverSheetError />)
    expect(screen.getByText(/If the problem persists, try refreshing the page/)).toBeInTheDocument()
  })

  it('renders border styles', () => {
    const { container } = render(<UniverSheetError />)
    expect(container.firstChild).toHaveClass('border')
    expect(container.firstChild).toHaveClass('border-border')
    expect(container.firstChild).toHaveClass('rounded-lg')
  })

  it('renders with background color', () => {
    const { container } = render(<UniverSheetError />)
    expect(container.firstChild).toHaveClass('bg-background')
  })

  it('renders with flex centering', () => {
    const { container } = render(<UniverSheetError />)
    expect(container.firstChild).toHaveClass('flex')
    expect(container.firstChild).toHaveClass('flex-col')
    expect(container.firstChild).toHaveClass('items-center')
    expect(container.firstChild).toHaveClass('justify-center')
  })

  it('handles multiple retry clicks', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<UniverSheetError onRetry={onRetry} />)

    const button = screen.getByText('Try Again')
    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(onRetry).toHaveBeenCalledTimes(3)
  })

  it('renders retry icon in button', () => {
    const { container } = render(<UniverSheetError onRetry={() => {}} />)
    const button = screen.getByText('Try Again').closest('button')
    const icon = button?.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })
})
