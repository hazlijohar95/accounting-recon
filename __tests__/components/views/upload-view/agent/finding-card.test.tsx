/**
 * FindingCard — Unit Tests
 *
 * Tests the individual finding card component:
 * - Severity styling and icons
 * - Expand/collapse behavior
 * - Action buttons per severity
 * - Structured details rendering
 * - Accessibility attributes
 *
 * @module __tests__/components/views/upload-view/agent/finding-card.test
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FindingCard } from '@/components/views/upload-view/agent/finding-card'
import type { AgentFindingData } from '@/hooks/useAgentSession'

// ============================================================================
// Fixtures
// ============================================================================

function createFinding(
  overrides: Partial<AgentFindingData> = {},
): AgentFindingData {
  return {
    _id: 'finding-1' as AgentFindingData['_id'],
    type: 'period_gap',
    severity: 'warning',
    title: 'Missing February Transactions',
    description: 'I have Jan and Mar but nothing for February.',
    status: 'open',
    createdAt: Date.now(),
    ...overrides,
  }
}

const noopRespond = vi.fn().mockResolvedValue(undefined)

// ============================================================================
// Rendering & Severity
// ============================================================================

describe('FindingCard', () => {
  it('renders the finding title and description', () => {
    render(<FindingCard finding={createFinding()} onRespond={noopRespond} />)
    expect(screen.getByText('Missing February Transactions')).toBeInTheDocument()
    expect(screen.getByText(/Jan and Mar/)).toBeInTheDocument()
  })

  it('auto-expands critical findings', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'critical' })}
        onRespond={noopRespond}
      />,
    )
    const button = screen.getByRole('button', { expanded: true })
    expect(button).toBeInTheDocument()
  })

  it('starts collapsed for info findings', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'info' })}
        onRespond={noopRespond}
      />,
    )
    const button = screen.getByRole('button', { expanded: false })
    expect(button).toBeInTheDocument()
  })

  it('toggles expand/collapse on header click', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'info' })}
        onRespond={noopRespond}
      />,
    )
    // Use aria-expanded to target the header button specifically (action buttons don't have it)
    const button = screen.getByRole('button', { expanded: false })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  // ============================================================================
  // Accessibility
  // ============================================================================

  it('has aria-controls linking button to body', () => {
    render(<FindingCard finding={createFinding()} onRespond={noopRespond} />)
    // Warning findings start collapsed — use aria-expanded to target the header button
    const button = screen.getByRole('button', { expanded: false })
    const controlsId = button.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(document.getElementById(controlsId!)).toBeInTheDocument()
  })

  it('has aria-label on the note input', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'critical' })}
        onRespond={noopRespond}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-label', 'Add a note for this finding')
  })

  // ============================================================================
  // Action Buttons
  // ============================================================================

  it('shows "Resolve" button for critical findings', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'critical' })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('Resolve')).toBeInTheDocument()
  })

  it('shows "Got it" and "Dismiss" buttons for warning findings', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'warning' })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('Got it')).toBeInTheDocument()
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  it('shows "Noted" button for info findings', () => {
    render(
      <FindingCard
        finding={createFinding({ severity: 'info' })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('Noted')).toBeInTheDocument()
  })

  it('calls onRespond with "acknowledged" when "Got it" is clicked', async () => {
    const mockRespond = vi.fn().mockResolvedValue(undefined)
    render(
      <FindingCard
        finding={createFinding({ severity: 'warning' })}
        onRespond={mockRespond}
      />,
    )

    fireEvent.click(screen.getByText('Got it'))

    await waitFor(() => {
      expect(mockRespond).toHaveBeenCalledWith(
        'finding-1',
        'acknowledged',
        undefined,
      )
    })
  })

  it('calls onRespond with "dismissed" when "Dismiss" is clicked', async () => {
    const mockRespond = vi.fn().mockResolvedValue(undefined)
    render(
      <FindingCard
        finding={createFinding({ severity: 'warning' })}
        onRespond={mockRespond}
      />,
    )

    fireEvent.click(screen.getByText('Dismiss'))

    await waitFor(() => {
      expect(mockRespond).toHaveBeenCalledWith(
        'finding-1',
        'dismissed',
        undefined,
      )
    })
  })

  // ============================================================================
  // Resolved / Dismissed State
  // ============================================================================

  it('hides action buttons for resolved findings', () => {
    render(
      <FindingCard
        finding={createFinding({ status: 'resolved' })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.queryByText('Got it')).not.toBeInTheDocument()
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })

  it('shows "Noted" badge for acknowledged findings', () => {
    render(
      <FindingCard
        finding={createFinding({ status: 'acknowledged' })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('Noted')).toBeInTheDocument()
  })

  // ============================================================================
  // Structured Details
  // ============================================================================

  it('renders parsed JSON details as key-value pairs', () => {
    render(
      <FindingCard
        finding={createFinding({
          details: JSON.stringify({ documentName: 'INV-001.pdf', amount: 4500 }),
        })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('Document Name:')).toBeInTheDocument()
    expect(screen.getByText('INV-001.pdf')).toBeInTheDocument()
    expect(screen.getByText('4500')).toBeInTheDocument()
  })

  it('does not render invalid JSON details', () => {
    render(
      <FindingCard
        finding={createFinding({ details: 'not valid json' })}
        onRespond={noopRespond}
      />,
    )
    // Should not crash, should not show any detail keys
    expect(screen.queryByText('not valid json')).not.toBeInTheDocument()
  })

  // ============================================================================
  // User Response Display
  // ============================================================================

  it('displays the user response when present', () => {
    render(
      <FindingCard
        finding={createFinding({ userResponse: 'This is expected.' })}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText(/This is expected/)).toBeInTheDocument()
  })
})
