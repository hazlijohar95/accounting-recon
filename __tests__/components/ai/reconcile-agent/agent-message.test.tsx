import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentMessage } from '@/components/ai/reconcile-agent/agent-message'
import type { UIMessage } from '@ai-sdk/react'

// Mock the AI SDK utilities
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

// Mock ChatMessage to keep tests focused on routing logic
vi.mock('@/components/ai/chat-message', () => ({
  ChatMessage: ({ role, content }: { role: string; content: string }) => (
    <div data-testid={`chat-msg-${role}`}>{content}</div>
  ),
  TypingIndicator: () => <div data-testid="typing-indicator" />,
}))

// Mock all tool-part components to verify routing
vi.mock('@/components/ai/reconcile-agent/tool-parts/confirmation-card', () => ({
  ConfirmationCard: ({ part }: any) => <div data-testid="tool-askForConfirmation">ConfirmationCard</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/transaction-table', () => ({
  TransactionTable: () => <div data-testid="tool-listTransactions">TransactionTable</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/session-stats', () => ({
  SessionStats: () => <div data-testid="tool-getSessionStats">SessionStats</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/mutation-result', () => ({
  MutationResult: ({ toolName }: any) => <div data-testid={`tool-${toolName}`}>MutationResult</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/match-explanation', () => ({
  MatchExplanation: () => <div data-testid="tool-getMatchExplanation">MatchExplanation</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/match-candidates', () => ({
  MatchCandidates: () => <div data-testid="tool-findMatchForSuspense">MatchCandidates</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/analysis-results', () => ({
  AnalysisResults: () => <div data-testid="tool-runMatchingAnalysis">AnalysisResults</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/expense-insights', () => ({
  ExpenseInsights: () => <div data-testid="tool-getExpenseInsights">ExpenseInsights</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/suspense-list', () => ({
  SuspenseList: () => <div data-testid="tool-listSuspenseItems">SuspenseList</div>,
}))
vi.mock('@/components/ai/reconcile-agent/tool-parts/match-details', () => ({
  MatchDetails: () => <div data-testid="tool-getMatchDetails">MatchDetails</div>,
}))

const mockAddToolOutput = vi.fn()

describe('AgentMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------
  // Text parts
  // ---------------------------------------------------------------
  it('renders text parts as ChatMessage', () => {
    const message: UIMessage = {
      id: 'msg_1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hello, I can help with reconciliation.' }],
    }

    render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
    expect(screen.getByTestId('chat-msg-assistant')).toHaveTextContent(
      'Hello, I can help with reconciliation.'
    )
  })

  it('renders user text messages', () => {
    const message: UIMessage = {
      id: 'msg_2',
      role: 'user',
      parts: [{ type: 'text', text: 'Show me the status' }],
    }

    render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
    expect(screen.getByTestId('chat-msg-user')).toHaveTextContent('Show me the status')
  })

  it('skips empty text parts', () => {
    const message: UIMessage = {
      id: 'msg_3',
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
    }

    render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
    expect(screen.queryByTestId('chat-msg-assistant')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Tool part routing — each tool maps to the correct renderer
  // ---------------------------------------------------------------
  const toolRoutingCases = [
    ['askForConfirmation', 'tool-askForConfirmation'],
    ['listTransactions', 'tool-listTransactions'],
    ['getSessionStats', 'tool-getSessionStats'],
    ['getMatchExplanation', 'tool-getMatchExplanation'],
    ['findMatchForSuspense', 'tool-findMatchForSuspense'],
    ['runMatchingAnalysis', 'tool-runMatchingAnalysis'],
    ['getExpenseInsights', 'tool-getExpenseInsights'],
    ['listSuspenseItems', 'tool-listSuspenseItems'],
    ['getMatchDetails', 'tool-getMatchDetails'],
  ] as const

  for (const [toolName, testId] of toolRoutingCases) {
    it(`routes tool-${toolName} to the correct renderer`, () => {
      const message: UIMessage = {
        id: `msg_tool_${toolName}`,
        role: 'assistant',
        parts: [
          {
            type: `tool-${toolName}` as any,
            toolCallId: `tc_${toolName}`,
            state: 'output-available',
            input: {},
            output: {},
          } as any,
        ],
      }

      render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    })
  }

  // Mutation tools route through MutationResult
  const mutationTools = ['approveMatch', 'rejectMatch', 'createManualMatch', 'bulkApproveMatches']
  for (const toolName of mutationTools) {
    it(`routes tool-${toolName} to MutationResult`, () => {
      const message: UIMessage = {
        id: `msg_tool_${toolName}`,
        role: 'assistant',
        parts: [
          {
            type: `tool-${toolName}` as any,
            toolCallId: `tc_${toolName}`,
            state: 'output-available',
            input: {},
            output: { success: true },
          } as any,
        ],
      }

      render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
      expect(screen.getByTestId(`tool-${toolName}`)).toBeInTheDocument()
    })
  }

  // ---------------------------------------------------------------
  // Unknown tool fallback
  // ---------------------------------------------------------------
  it('renders loading fallback for unknown tool in streaming state', () => {
    const message: UIMessage = {
      id: 'msg_unknown',
      role: 'assistant',
      parts: [
        {
          type: 'tool-unknownTool' as any,
          toolCallId: 'tc_unknown',
          state: 'input-streaming',
          input: {},
        } as any,
      ],
    }

    render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
    expect(screen.getByText(/Calling unknownTool/)).toBeInTheDocument()
  })

  it('renders error fallback for output-error state', () => {
    const message: UIMessage = {
      id: 'msg_error',
      role: 'assistant',
      parts: [
        {
          type: 'tool-failingTool' as any,
          toolCallId: 'tc_fail',
          state: 'output-error',
          input: {},
        } as any,
      ],
    }

    render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)
    expect(screen.getByText(/Tool call failed: failingTool/)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Mixed parts (text + tools)
  // ---------------------------------------------------------------
  it('renders mixed text and tool parts in sequence', () => {
    const message: UIMessage = {
      id: 'msg_mixed',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Let me check the stats...' },
        {
          type: 'tool-getSessionStats' as any,
          toolCallId: 'tc_stats',
          state: 'output-available',
          input: {},
          output: {},
        } as any,
        { type: 'text', text: 'Here are the results.' },
      ],
    }

    render(<AgentMessage message={message} addToolOutput={mockAddToolOutput} />)

    expect(screen.getByText('Let me check the stats...')).toBeInTheDocument()
    expect(screen.getByTestId('tool-getSessionStats')).toBeInTheDocument()
    expect(screen.getByText('Here are the results.')).toBeInTheDocument()
  })
})
