/**
 * AgentProgressView — Unit Tests
 *
 * Tests the progress display during extraction + analysis steps.
 *
 * @module __tests__/components/views/upload-view/agent/agent-progress-view.test
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentProgressView } from '@/components/views/upload-view/agent/agent-progress-view'

describe('AgentProgressView', () => {
  it('shows extraction in progress when not done', () => {
    render(
      <AgentProgressView
        documentCount={5}
        isAnalyzing={false}
        extractionProgress={{ completed: 2, total: 5, failed: 0 }}
      />,
    )
    expect(screen.getByText('Extracting transactions...')).toBeInTheDocument()
    expect(screen.getByText('2 of 5 documents processed')).toBeInTheDocument()
  })

  it('shows extraction complete when all processed', () => {
    render(
      <AgentProgressView
        documentCount={5}
        isAnalyzing={false}
        extractionProgress={{ completed: 5, total: 5, failed: 0 }}
      />,
    )
    expect(screen.getByText('Extraction complete')).toBeInTheDocument()
  })

  it('shows failed count when extractions fail', () => {
    render(
      <AgentProgressView
        documentCount={5}
        isAnalyzing={false}
        extractionProgress={{ completed: 3, total: 5, failed: 2 }}
      />,
    )
    expect(screen.getByText(/2 failed/)).toBeInTheDocument()
  })

  it('shows analysis status when analyzing', () => {
    render(
      <AgentProgressView
        documentCount={5}
        isAnalyzing={true}
        extractionProgress={{ completed: 5, total: 5, failed: 0 }}
      />,
    )
    expect(screen.getByText('Analyzing your documents...')).toBeInTheDocument()
    expect(screen.getByText(/gaps, duplicates/)).toBeInTheDocument()
  })

  it('shows fallback text when no progress data available', () => {
    render(
      <AgentProgressView
        documentCount={3}
        isAnalyzing={false}
        extractionProgress={null}
      />,
    )
    expect(screen.getByText(/Processing 3 documents/)).toBeInTheDocument()
  })

  it('handles singular document count', () => {
    render(
      <AgentProgressView
        documentCount={1}
        isAnalyzing={false}
        extractionProgress={null}
      />,
    )
    expect(screen.getByText('Processing 1 document...')).toBeInTheDocument()
  })

  // Accessibility
  it('renders progress bar with ARIA attributes', () => {
    render(
      <AgentProgressView
        documentCount={5}
        isAnalyzing={false}
        extractionProgress={{ completed: 3, total: 5, failed: 0 }}
      />,
    )
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '60')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  it('does not render progress bar when extraction is complete', () => {
    render(
      <AgentProgressView
        documentCount={5}
        isAnalyzing={false}
        extractionProgress={{ completed: 5, total: 5, failed: 0 }}
      />,
    )
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
