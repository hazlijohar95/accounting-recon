import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmationCard } from '@/components/ai/reconcile-agent/tool-parts/confirmation-card'

describe('ConfirmationCard', () => {
  const defaultInput = {
    action: 'approve_match' as const,
    title: 'Approve Match #123',
    description: 'This will approve the match between Transaction A and Invoice B.',
    affectedCount: 1,
  }

  const mockAddToolOutput = vi.fn()

  const makePart = (overrides: Record<string, unknown> = {}) => ({
    toolCallId: 'tc_001',
    state: 'input-available',
    input: defaultInput,
    output: undefined as string | undefined,
    ...overrides,
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------
  it('renders loading skeleton when input is streaming', () => {
    const { container } = render(
      <ConfirmationCard part={makePart({ state: 'input-streaming' })} addToolOutput={mockAddToolOutput} />
    )
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByText('Preparing confirmation...')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Actionable state
  // ---------------------------------------------------------------
  it('renders Confirm and Cancel buttons when input is available', () => {
    render(<ConfirmationCard part={makePart()} addToolOutput={mockAddToolOutput} />)

    expect(screen.getByText('Approve Match #123')).toBeInTheDocument()
    expect(screen.getByText(/This will approve/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('renders action badge and affected count', () => {
    render(<ConfirmationCard part={makePart()} addToolOutput={mockAddToolOutput} />)
    expect(screen.getByText('approve match')).toBeInTheDocument()
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('pluralizes affected count correctly', () => {
    render(
      <ConfirmationCard
        part={makePart({ input: { ...defaultInput, affectedCount: 5 } })}
        addToolOutput={mockAddToolOutput}
      />
    )
    expect(screen.getByText('5 items')).toBeInTheDocument()
  })

  it('handles bulk action badge styling', () => {
    render(
      <ConfirmationCard
        part={makePart({ input: { ...defaultInput, action: 'bulk_approve' } })}
        addToolOutput={mockAddToolOutput}
      />
    )
    expect(screen.getByText('bulk approve')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // User interaction
  // ---------------------------------------------------------------
  it('calls addToolOutput with "confirmed" when Confirm is clicked', () => {
    render(<ConfirmationCard part={makePart()} addToolOutput={mockAddToolOutput} />)

    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }))

    expect(mockAddToolOutput).toHaveBeenCalledOnce()
    expect(mockAddToolOutput).toHaveBeenCalledWith({
      tool: 'askForConfirmation',
      toolCallId: 'tc_001',
      output: 'confirmed',
    })
  })

  it('calls addToolOutput with "denied" when Cancel is clicked', () => {
    render(<ConfirmationCard part={makePart()} addToolOutput={mockAddToolOutput} />)

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(mockAddToolOutput).toHaveBeenCalledOnce()
    expect(mockAddToolOutput).toHaveBeenCalledWith({
      tool: 'askForConfirmation',
      toolCallId: 'tc_001',
      output: 'denied',
    })
  })

  // ---------------------------------------------------------------
  // Resolved states
  // ---------------------------------------------------------------
  it('renders "Confirmed" badge and hides buttons when confirmed', () => {
    render(
      <ConfirmationCard
        part={makePart({ state: 'output-available', output: 'confirmed' })}
        addToolOutput={mockAddToolOutput}
      />
    )

    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirm/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument()
  })

  it('renders "Cancelled" badge and hides buttons when denied', () => {
    render(
      <ConfirmationCard
        part={makePart({ state: 'output-available', output: 'denied' })}
        addToolOutput={mockAddToolOutput}
      />
    )

    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirm/i })).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Null guard
  // ---------------------------------------------------------------
  it('returns null if input is missing', () => {
    const { container } = render(
      <ConfirmationCard
        part={{ toolCallId: 'tc_001', state: 'input-available', input: undefined as any }}
        addToolOutput={mockAddToolOutput}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  // ---------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------
  it('has accessible button labels with action context', () => {
    render(<ConfirmationCard part={makePart()} addToolOutput={mockAddToolOutput} />)

    const confirmBtn = screen.getByRole('button', { name: /Confirm: Approve Match #123/i })
    const cancelBtn = screen.getByRole('button', { name: /Cancel: Approve Match #123/i })
    expect(confirmBtn).toBeInTheDocument()
    expect(cancelBtn).toBeInTheDocument()
  })

  it('has role="group" on the button container', () => {
    render(<ConfirmationCard part={makePart()} addToolOutput={mockAddToolOutput} />)
    expect(screen.getByRole('group', { name: /Confirmation actions/i })).toBeInTheDocument()
  })
})
