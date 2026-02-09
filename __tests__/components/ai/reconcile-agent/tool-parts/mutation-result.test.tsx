import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MutationResult } from '@/components/ai/reconcile-agent/tool-parts/mutation-result'

describe('MutationResult', () => {
  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  // ---------------------------------------------------------------
  // Loading states
  // ---------------------------------------------------------------
  it('renders loading spinner during input-streaming', () => {
    const { container } = render(
      <MutationResult part={makePart('input-streaming')} toolName="approveMatch" />
    )
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByText(/Executing Match Approved/)).toBeInTheDocument()
  })

  it('renders loading spinner during input-available', () => {
    render(<MutationResult part={makePart('input-available')} toolName="bulkApproveMatches" />)
    expect(screen.getByText(/Executing Bulk Approve/)).toBeInTheDocument()
  })

  it('falls back to raw tool name for unknown tools', () => {
    render(<MutationResult part={makePart('input-available')} toolName="unknownTool" />)
    expect(screen.getByText(/Executing unknownTool/)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Success result
  // ---------------------------------------------------------------
  it('renders success badge and message', () => {
    render(
      <MutationResult
        part={makePart('output-available', {
          success: true,
          action: 'approved',
          message: 'Match approved successfully.',
        })}
        toolName="approveMatch"
      />
    )

    expect(screen.getByText('\u2713')).toBeInTheDocument() // Check mark
    expect(screen.getByText('Match Approved')).toBeInTheDocument()
    expect(screen.getByText('Match approved successfully.')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Failure result
  // ---------------------------------------------------------------
  it('renders error badge and message', () => {
    render(
      <MutationResult
        part={makePart('output-available', {
          success: false,
          error: 'Match already processed.',
        })}
        toolName="rejectMatch"
      />
    )

    expect(screen.getByText('\u2717')).toBeInTheDocument() // X mark
    expect(screen.getByText('Match Rejected')).toBeInTheDocument()
    expect(screen.getByText('Match already processed.')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Null guard
  // ---------------------------------------------------------------
  it('returns null when output is undefined', () => {
    const { container } = render(
      <MutationResult part={makePart('output-available', undefined)} toolName="approveMatch" />
    )
    expect(container.innerHTML).toBe('')
  })
})
