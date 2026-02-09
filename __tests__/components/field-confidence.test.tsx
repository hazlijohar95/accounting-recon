import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ConfidenceIndicator,
  ConfidenceSummary,
  getConfidenceColors,
  getConfidenceLevel,
  ConfidenceField,
} from '@/components/field-confidence'

vi.mock('@/components/document-viewer', () => ({
  SourceLinkButton: () => <button>Source</button>,
}))

describe('confidence helpers', () => {
  it('returns confidence level', () => {
    expect(getConfidenceLevel(95)).toBe('high')
    expect(getConfidenceLevel(75)).toBe('medium')
    expect(getConfidenceLevel(50)).toBe('low')
  })

  it('returns default colors when undefined', () => {
    const colors = getConfidenceColors(undefined)
    expect(colors.bg).toBe('bg-secondary/50')
  })
})

describe('ConfidenceIndicator', () => {
  it('renders label and percentage', () => {
    render(<ConfidenceIndicator confidence={92} showLabel />)
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })
})

describe('ConfidenceField', () => {
  it('renders low confidence warning and source link', () => {
    render(
      <ConfidenceField
        label="Amount"
        value={100}
        confidence={60}
        boundingBox={{ x: 0, y: 0, width: 10, height: 10 }}
        documentId={'doc_1' as any}
        pageNumber={1}
      />
    )

    expect(screen.getByText('AI uncertain - please verify this value')).toBeInTheDocument()
    expect(screen.getByText('Source')).toBeInTheDocument()
  })
})

describe('ConfidenceSummary', () => {
  it('renders averages and field grid', () => {
    render(
      <ConfidenceSummary
        fieldConfidence={{
          date: 90,
          description: 80,
          amount: 70,
        }}
      />
    )

    expect(screen.getByText('Field Confidence')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })
})
