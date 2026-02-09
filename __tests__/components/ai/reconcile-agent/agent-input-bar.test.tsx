import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentInputBar } from '@/components/ai/reconcile-agent/agent-input-bar'

// Mock the brand icons
vi.mock('@/components/brand/icons', () => ({
  IconSend: () => <svg data-testid="icon-send" />,
  IconBrain: () => <svg data-testid="icon-brain" />,
  IconQuestion: () => <svg data-testid="icon-question" />,
  IconSearch: () => <svg data-testid="icon-search" />,
}))

describe('AgentInputBar', () => {
  const mockSendMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------
  // Input rendering
  // ---------------------------------------------------------------
  it('renders input field with correct placeholder when expanded', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox', { name: /Ask reconciliation agent/i })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Ask about matches, suspense items, approve matches...')
  })

  it('renders collapsed placeholder when not expanded', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={false}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox', { name: /Ask reconciliation agent/i })
    expect(input).toHaveAttribute('placeholder', 'Ask AI about reconciliation...')
  })

  // ---------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------
  it('sends message on form submit', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Show me unmatched items' } })
    fireEvent.submit(input.closest('form')!)

    expect(mockSendMessage).toHaveBeenCalledOnce()
    expect(mockSendMessage).toHaveBeenCalledWith('Show me unmatched items')
  })

  it('clears input after sending', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test message' } })
    fireEvent.submit(input.closest('form')!)

    expect(input.value).toBe('')
  })

  it('does not send empty messages', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.submit(input.closest('form')!)

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('does not send whitespace-only messages', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form')!)

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('does not send when loading', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={true}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.submit(input.closest('form')!)

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------
  // Send button
  // ---------------------------------------------------------------
  it('renders send button when expanded', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    expect(screen.getByRole('button', { name: /Send message/i })).toBeInTheDocument()
  })

  it('disables send button when input is empty', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    expect(screen.getByRole('button', { name: /Send message/i })).toBeDisabled()
  })

  it('disables send button when loading', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={true}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    expect(screen.getByRole('button', { name: /Send message/i })).toBeDisabled()
  })

  // ---------------------------------------------------------------
  // Quick actions
  // ---------------------------------------------------------------
  it('renders quick action buttons when showQuickActions is true and expanded', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={true}
      />
    )

    expect(screen.getByText('Run AI Analysis')).toBeInTheDocument()
    expect(screen.getByText('Show summary')).toBeInTheDocument()
    expect(screen.getByText('Find unmatched')).toBeInTheDocument()
  })

  it('does not render quick actions when not expanded', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={false}
        showQuickActions={true}
      />
    )

    expect(screen.queryByText('Run AI Analysis')).not.toBeInTheDocument()
  })

  it('does not render quick actions when showQuickActions is false', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    expect(screen.queryByText('Run AI Analysis')).not.toBeInTheDocument()
  })

  it('sends correct prompt when "Run AI Analysis" is clicked', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={true}
      />
    )

    fireEvent.click(screen.getByText('Run AI Analysis'))
    expect(mockSendMessage).toHaveBeenCalledWith(
      'Analyze pending transactions and suggest matches'
    )
  })

  it('sends correct prompt when "Show summary" is clicked', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={true}
      />
    )

    fireEvent.click(screen.getByText('Show summary'))
    expect(mockSendMessage).toHaveBeenCalledWith(
      "What's the current reconciliation status?"
    )
  })

  it('sends correct prompt when "Find unmatched" is clicked', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={false}
        isExpanded={true}
        showQuickActions={true}
      />
    )

    fireEvent.click(screen.getByText('Find unmatched'))
    expect(mockSendMessage).toHaveBeenCalledWith('List all suspense items')
  })

  it('disables quick action buttons when loading', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={true}
        isExpanded={true}
        showQuickActions={true}
      />
    )

    fireEvent.click(screen.getByText('Run AI Analysis'))
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------
  it('disables input when loading', () => {
    render(
      <AgentInputBar
        onSendMessage={mockSendMessage}
        isLoading={true}
        isExpanded={true}
        showQuickActions={false}
      />
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
