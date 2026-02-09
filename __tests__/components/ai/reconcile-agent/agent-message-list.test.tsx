import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentMessageList } from '@/components/ai/reconcile-agent/agent-message-list'
import type { UIMessage } from '@ai-sdk/react'

// jsdom does not implement scrollTo on div elements
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn()
})

// Mock AI SDK
vi.mock('ai', () => ({
  isToolUIPart: (part: any) =>
    typeof part?.type === 'string' && part.type.startsWith('tool-'),
  getToolName: (part: any) => {
    if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
      return part.type.replace('tool-', '')
    }
    return ''
  },
}))

// Mock ChatMessage and TypingIndicator
vi.mock('@/components/ai/chat-message', () => ({
  ChatMessage: ({ role, content }: { role: string; content: string }) => (
    <div data-testid={`chat-msg-${role}`}>{content}</div>
  ),
  TypingIndicator: () => <div data-testid="typing-indicator">Typing...</div>,
}))

// Mock all tool parts to simplify
vi.mock('@/components/ai/reconcile-agent/tool-parts/confirmation-card', () => ({
  ConfirmationCard: () => <div data-testid="confirmation-card" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/transaction-table', () => ({
  TransactionTable: () => <div data-testid="transaction-table" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/session-stats', () => ({
  SessionStats: () => <div data-testid="session-stats" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/mutation-result', () => ({
  MutationResult: () => <div data-testid="mutation-result" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/match-explanation', () => ({
  MatchExplanation: () => <div data-testid="match-explanation" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/match-candidates', () => ({
  MatchCandidates: () => <div data-testid="match-candidates" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/analysis-results', () => ({
  AnalysisResults: () => <div data-testid="analysis-results" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/expense-insights', () => ({
  ExpenseInsights: () => <div data-testid="expense-insights" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/suspense-list', () => ({
  SuspenseList: () => <div data-testid="suspense-list" />,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/match-details', () => ({
  MatchDetails: () => <div data-testid="match-details" />,
}))

const mockAddToolOutput = vi.fn()

describe('AgentMessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an empty list', () => {
    const { container } = render(
      <AgentMessageList messages={[]} isLoading={false} addToolOutput={mockAddToolOutput} />
    )

    expect(container.querySelector('.assistant-messages')).toBeInTheDocument()
  })

  it('renders multiple messages', () => {
    const messages: UIMessage[] = [
      {
        id: 'msg_1',
        role: 'user',
        parts: [{ type: 'text', text: 'Show status' }],
      },
      {
        id: 'msg_2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Here is the reconciliation status.' }],
      },
    ]

    render(
      <AgentMessageList messages={messages} isLoading={false} addToolOutput={mockAddToolOutput} />
    )

    expect(screen.getByText('Show status')).toBeInTheDocument()
    expect(screen.getByText('Here is the reconciliation status.')).toBeInTheDocument()
  })

  it('shows typing indicator when loading', () => {
    render(
      <AgentMessageList messages={[]} isLoading={true} addToolOutput={mockAddToolOutput} />
    )

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('does not show typing indicator when not loading', () => {
    render(
      <AgentMessageList messages={[]} isLoading={false} addToolOutput={mockAddToolOutput} />
    )

    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------
  it('has role="log" for screen reader support', () => {
    const { container } = render(
      <AgentMessageList messages={[]} isLoading={false} addToolOutput={mockAddToolOutput} />
    )

    const list = container.querySelector('[role="log"]')
    expect(list).toBeInTheDocument()
    expect(list).toHaveAttribute('aria-label', 'Agent messages')
    expect(list).toHaveAttribute('aria-live', 'polite')
  })

  // ---------------------------------------------------------------
  // Message with tool parts renders correctly
  // ---------------------------------------------------------------
  it('renders messages containing tool parts', () => {
    const messages: UIMessage[] = [
      {
        id: 'msg_with_tool',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Checking stats...' },
          {
            type: 'tool-getSessionStats' as any,
            toolCallId: 'tc_1',
            state: 'output-available',
            input: {},
            output: {},
          } as any,
        ],
      },
    ]

    render(
      <AgentMessageList messages={messages} isLoading={false} addToolOutput={mockAddToolOutput} />
    )

    expect(screen.getByText('Checking stats...')).toBeInTheDocument()
    expect(screen.getByTestId('session-stats')).toBeInTheDocument()
  })
})
