import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock all sub-demo components to test the orchestrator in isolation
vi.mock('@/app/(main)/design/_components/components/buttons-demo', () => ({
  ButtonsDemo: () => <div data-testid="buttons-demo">ButtonsDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/form-inputs-demo', () => ({
  FormInputsDemo: () => <div data-testid="form-inputs-demo">FormInputsDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/cards-demo', () => ({
  CardsDemo: () => <div data-testid="cards-demo">CardsDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/navigation-demo', () => ({
  NavigationDemo: () => <div data-testid="navigation-demo">NavigationDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/status-demos', () => ({
  StatusIndicatorsDemo: () => <div data-testid="status-indicators-demo">StatusIndicatorsDemo</div>,
  AlertsEmptyStatesDemo: () => <div data-testid="alerts-demo">AlertsEmptyStatesDemo</div>,
  TimelineDemo: () => <div data-testid="timeline-demo">TimelineDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/modal-demo', () => ({
  ModalDemo: () => <div data-testid="modal-demo">ModalDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/data-display-demos', () => ({
  DataTableDemo: () => <div data-testid="data-table-demo">DataTableDemo</div>,
  ComparisonDiffDemo: () => <div data-testid="comparison-diff-demo">ComparisonDiffDemo</div>,
}))
vi.mock('@/app/(main)/design/_components/components/filter-search-demo', () => ({
  FilterSearchDemo: () => <div data-testid="filter-search-demo">FilterSearchDemo</div>,
}))

import { ComponentsSection } from '@/app/(main)/design/_components/components-section'

describe('ComponentsSection', () => {
  it('renders the Components heading', () => {
    render(<ComponentsSection />)
    expect(screen.getByText('Components')).toBeInTheDocument()
  })

  it('renders the section description', () => {
    render(<ComponentsSection />)
    expect(
      screen.getByText('Interactive UI components and their various states.')
    ).toBeInTheDocument()
  })

  it('has a section with id="components"', () => {
    const { container } = render(<ComponentsSection />)
    expect(container.querySelector('#components')).toBeInTheDocument()
  })

  it('renders all 11 sub-demo components', () => {
    render(<ComponentsSection />)

    expect(screen.getByTestId('buttons-demo')).toBeInTheDocument()
    expect(screen.getByTestId('form-inputs-demo')).toBeInTheDocument()
    expect(screen.getByTestId('cards-demo')).toBeInTheDocument()
    expect(screen.getByTestId('navigation-demo')).toBeInTheDocument()
    expect(screen.getByTestId('status-indicators-demo')).toBeInTheDocument()
    expect(screen.getByTestId('modal-demo')).toBeInTheDocument()
    expect(screen.getByTestId('alerts-demo')).toBeInTheDocument()
    expect(screen.getByTestId('data-table-demo')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-demo')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-diff-demo')).toBeInTheDocument()
    expect(screen.getByTestId('filter-search-demo')).toBeInTheDocument()
  })

  it('renders sub-demos in correct order', () => {
    const { container } = render(<ComponentsSection />)
    const testIds = Array.from(container.querySelectorAll('[data-testid]')).map(
      (el) => el.getAttribute('data-testid')
    )

    expect(testIds).toEqual([
      'buttons-demo',
      'form-inputs-demo',
      'cards-demo',
      'navigation-demo',
      'status-indicators-demo',
      'modal-demo',
      'alerts-demo',
      'data-table-demo',
      'timeline-demo',
      'comparison-diff-demo',
      'filter-search-demo',
    ])
  })
})
