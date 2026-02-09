/**
 * FindingsSummary — Unit Tests
 *
 * Tests the findings grouping component.
 *
 * @module __tests__/components/views/upload-view/agent/findings-summary.test
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FindingsSummary } from '@/components/views/upload-view/agent/findings-summary'
import type { AgentFindingData } from '@/hooks/useAgentSession'

// ============================================================================
// Fixtures
// ============================================================================

function createFinding(
  overrides: Partial<AgentFindingData> = {},
): AgentFindingData {
  return {
    _id: `finding-${Math.random()}` as AgentFindingData['_id'],
    type: 'period_gap',
    severity: 'warning',
    title: 'Test Finding',
    description: 'Test description',
    status: 'open',
    createdAt: Date.now(),
    ...overrides,
  }
}

const noopRespond = vi.fn().mockResolvedValue(undefined)

// ============================================================================
// Tests
// ============================================================================

describe('FindingsSummary', () => {
  it('shows empty state when no findings', () => {
    render(
      <FindingsSummary findings={[]} onRespond={noopRespond} />,
    )
    expect(screen.getByText('No findings to report. Your documents look good.')).toBeInTheDocument()
  })

  it('shows findings count', () => {
    const findings = [
      createFinding({ severity: 'critical', title: 'Critical Issue' }),
      createFinding({ severity: 'warning', title: 'Warning Issue' }),
    ]
    render(
      <FindingsSummary findings={findings} onRespond={noopRespond} />,
    )
    expect(screen.getByText('2 findings')).toBeInTheDocument()
  })

  it('groups findings by severity with correct labels', () => {
    const findings = [
      createFinding({ severity: 'critical', title: 'Critical Issue' }),
      createFinding({ severity: 'warning', title: 'Warning Issue' }),
      createFinding({ severity: 'info', title: 'Info Finding' }),
    ]
    render(
      <FindingsSummary findings={findings} onRespond={noopRespond} />,
    )
    expect(screen.getByText('Must Address (1)')).toBeInTheDocument()
    expect(screen.getByText('Good to Know (1)')).toBeInTheDocument()
    expect(screen.getByText('For Your Information (1)')).toBeInTheDocument()
  })

  it('renders the summary text when provided', () => {
    render(
      <FindingsSummary
        findings={[]}
        summary="Your documents look great."
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('Your documents look great.')).toBeInTheDocument()
  })

  it('shows "All reviewed" when all findings are resolved/dismissed', () => {
    const findings = [
      createFinding({ status: 'resolved' }),
      createFinding({ status: 'dismissed' }),
    ]
    render(
      <FindingsSummary findings={findings} onRespond={noopRespond} />,
    )
    expect(screen.getByText('All reviewed')).toBeInTheDocument()
  })

  it('shows open count when some findings are still open', () => {
    const findings = [
      createFinding({ status: 'open' }),
      createFinding({ status: 'resolved' }),
    ]
    render(
      <FindingsSummary findings={findings} onRespond={noopRespond} />,
    )
    expect(screen.getByText('1 to review')).toBeInTheDocument()
  })

  it('uses singular form for 1 finding', () => {
    render(
      <FindingsSummary
        findings={[createFinding()]}
        onRespond={noopRespond}
      />,
    )
    expect(screen.getByText('1 finding')).toBeInTheDocument()
  })
})
