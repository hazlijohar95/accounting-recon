import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the code-block to avoid testing its internals here
vi.mock('@/app/(main)/design/_components/code-block', () => ({
  CodeBlock: ({ code }: { code: string }) => <pre data-testid="code-block">{code}</pre>,
}))

// Mock brand icons - use data-testid only, no text content to avoid collisions
vi.mock('@/components/brand/icons', () => ({
  IconX: () => <span data-testid="icon-x" />,
  IconUpload: () => <span data-testid="icon-upload" />,
  IconCheck: () => <span data-testid="icon-check" />,
  IconArrowRight: () => <span data-testid="icon-arrow-right" />,
  IconCaretRight: () => <span data-testid="icon-caret-right" />,
  IconSquaresFour: () => <span data-testid="icon-grid" />,
  IconFileText: () => <span data-testid="icon-file" />,
  IconGitDiff: () => <span data-testid="icon-diff" />,
  IconWarningCircle: () => <span data-testid="icon-warning" />,
  IconCheckCircle: () => <span data-testid="icon-check-circle" />,
  IconXCircle: () => <span data-testid="icon-x-circle" />,
  IconFlag: () => <span data-testid="icon-flag" />,
  IconSearch: () => <span data-testid="icon-search" />,
  IconFilter: () => <span data-testid="icon-filter" />,
  IconCalendar: () => <span data-testid="icon-calendar" />,
  IconClock: () => <span data-testid="icon-clock" />,
}))

import { ButtonsDemo } from '@/app/(main)/design/_components/components/buttons-demo'
import { FormInputsDemo } from '@/app/(main)/design/_components/components/form-inputs-demo'
import { CardsDemo } from '@/app/(main)/design/_components/components/cards-demo'
import { NavigationDemo } from '@/app/(main)/design/_components/components/navigation-demo'
import {
  StatusIndicatorsDemo,
  AlertsEmptyStatesDemo,
  TimelineDemo,
} from '@/app/(main)/design/_components/components/status-demos'
import { ModalDemo } from '@/app/(main)/design/_components/components/modal-demo'
import { DataTableDemo, ComparisonDiffDemo } from '@/app/(main)/design/_components/components/data-display-demos'
import { FilterSearchDemo } from '@/app/(main)/design/_components/components/filter-search-demo'

describe('ButtonsDemo', () => {
  it('renders the Buttons heading', () => {
    render(<ButtonsDemo />)
    expect(screen.getByText('Buttons')).toBeInTheDocument()
  })

  it('renders button variants', () => {
    render(<ButtonsDemo />)
    expect(screen.getByText('Primary Action')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('renders state toggle controls', () => {
    render(<ButtonsDemo />)
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('hover')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('disabled')).toBeInTheDocument()
  })

  it('toggles button state when state button is clicked', () => {
    render(<ButtonsDemo />)
    const disabledBtn = screen.getByText('disabled')
    fireEvent.click(disabledBtn)

    // Primary Action button should now be disabled
    const primaryBtn = screen.getByText('Primary Action')
    expect(primaryBtn).toBeDisabled()
  })

  it('renders a code block', () => {
    render(<ButtonsDemo />)
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })
})

describe('FormInputsDemo', () => {
  it('renders the Form Inputs heading', () => {
    render(<FormInputsDemo />)
    expect(screen.getByText('Form Inputs')).toBeInTheDocument()
  })

  it('renders text input', () => {
    render(<FormInputsDemo />)
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
  })

  it('renders file upload area', () => {
    render(<FormInputsDemo />)
    expect(screen.getByText('Click to upload')).toBeInTheDocument()
  })

  it('renders checkbox with label', () => {
    render(<FormInputsDemo />)
    expect(screen.getByText('Enable feature')).toBeInTheDocument()
  })

  it('toggles checkbox state on click', () => {
    const { container } = render(<FormInputsDemo />)
    const checkboxBtn = screen.getByText('Enable feature').closest('label')?.querySelector('button')
    expect(checkboxBtn).toBeInTheDocument()

    fireEvent.click(checkboxBtn!)
    // After click, checkbox should show check icon (bg-foreground indicates checked state)
    expect(checkboxBtn).toHaveClass('bg-foreground')
  })
})

describe('CardsDemo', () => {
  it('renders the Cards heading', () => {
    render(<CardsDemo />)
    expect(screen.getByText('Cards')).toBeInTheDocument()
  })

  it('renders stats card with value', () => {
    render(<CardsDemo />)
    expect(screen.getByText('$12,450.00')).toBeInTheDocument()
    expect(screen.getByText('Cash In')).toBeInTheDocument()
  })

  it('renders list container with items', () => {
    render(<CardsDemo />)
    expect(screen.getByText('Recent Items')).toBeInTheDocument()
    expect(screen.getByText('Item One')).toBeInTheDocument()
    expect(screen.getByText('Item Two')).toBeInTheDocument()
    expect(screen.getByText('Item Three')).toBeInTheDocument()
  })
})

describe('NavigationDemo', () => {
  it('renders the Navigation heading', () => {
    render(<NavigationDemo />)
    expect(screen.getByText('Navigation')).toBeInTheDocument()
  })

  it('renders sidebar nav items', () => {
    render(<NavigationDemo />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Reconcile')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('renders tab navigation', () => {
    render(<NavigationDemo />)
    expect(screen.getByText('Pending (1)')).toBeInTheDocument()
    expect(screen.getByText('Matched (2)')).toBeInTheDocument()
    expect(screen.getByText('Suspense (3)')).toBeInTheDocument()
  })

  it('changes active sidebar item on click', () => {
    render(<NavigationDemo />)
    const uploadBtn = screen.getByText('Upload')
    fireEvent.click(uploadBtn)

    // Upload should now have active styling
    expect(uploadBtn.closest('button')).toHaveClass('bg-secondary')
  })

  it('changes active tab on click', () => {
    render(<NavigationDemo />)
    const matchedTab = screen.getByText('Matched (2)')
    fireEvent.click(matchedTab)

    expect(matchedTab).toHaveClass('border-b-2')
  })
})

describe('StatusIndicatorsDemo', () => {
  it('renders status heading', () => {
    render(<StatusIndicatorsDemo />)
    expect(screen.getByText('Status Indicators')).toBeInTheDocument()
  })

  it('renders dot indicators', () => {
    render(<StatusIndicatorsDemo />)
    expect(screen.getByText('Matched')).toBeInTheDocument()
    expect(screen.getByText('Suspense')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders confidence badges', () => {
    render(<StatusIndicatorsDemo />)
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('renders progress bar', () => {
    render(<StatusIndicatorsDemo />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })
})

describe('AlertsEmptyStatesDemo', () => {
  it('renders alerts heading', () => {
    render(<AlertsEmptyStatesDemo />)
    expect(screen.getByText('Alerts & Empty States')).toBeInTheDocument()
  })

  it('renders warning alert', () => {
    render(<AlertsEmptyStatesDemo />)
    expect(screen.getByText('Attention required')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<AlertsEmptyStatesDemo />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
    expect(screen.getByText('Upload File')).toBeInTheDocument()
  })
})

describe('TimelineDemo', () => {
  it('renders timeline heading', () => {
    render(<TimelineDemo />)
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('renders timeline events', () => {
    render(<TimelineDemo />)
    expect(screen.getByText('Transaction Matched')).toBeInTheDocument()
    expect(screen.getByText('Review Required')).toBeInTheDocument()
    expect(screen.getByText('Bank Statement Uploaded')).toBeInTheDocument()
    expect(screen.getByText('Moved to Suspense')).toBeInTheDocument()
  })

  it('renders timestamps', () => {
    render(<TimelineDemo />)
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    expect(screen.getByText('1 day ago')).toBeInTheDocument()
  })
})

describe('ModalDemo', () => {
  it('renders modal heading', () => {
    render(<ModalDemo />)
    expect(screen.getByText('Modal')).toBeInTheDocument()
  })

  it('renders modal structure', () => {
    render(<ModalDemo />)
    expect(screen.getByText('Modal Title')).toBeInTheDocument()
    expect(screen.getByText('Supporting text')).toBeInTheDocument()
    expect(screen.getByText('Modal content goes here.')).toBeInTheDocument()
  })

  it('renders modal action buttons', () => {
    render(<ModalDemo />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })
})

describe('DataTableDemo', () => {
  it('renders data table heading', () => {
    render(<DataTableDemo />)
    expect(screen.getByText('Data Table')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(<DataTableDemo />)
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders transaction rows', () => {
    render(<DataTableDemo />)
    expect(screen.getByText('ACME Corp Payment')).toBeInTheDocument()
    expect(screen.getByText('Vendor Payment - Supplies')).toBeInTheDocument()
    expect(screen.getByText('Unknown Transfer')).toBeInTheDocument()
  })

  it('renders pagination', () => {
    render(<DataTableDemo />)
    expect(screen.getByText('Showing 1-3 of 156')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<DataTableDemo />)
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Batch Match')).toBeInTheDocument()
  })
})

describe('ComparisonDiffDemo', () => {
  it('renders comparison heading', () => {
    render(<ComparisonDiffDemo />)
    expect(screen.getByText('Comparison Diff View')).toBeInTheDocument()
  })

  it('renders bank transaction side', () => {
    render(<ComparisonDiffDemo />)
    expect(screen.getByText('Bank Transaction')).toBeInTheDocument()
  })

  it('renders invoice side', () => {
    render(<ComparisonDiffDemo />)
    expect(screen.getByText('Invoice #1234')).toBeInTheDocument()
  })

  it('renders match summary', () => {
    render(<ComparisonDiffDemo />)
    expect(screen.getByText('2 exact matches')).toBeInTheDocument()
    expect(screen.getByText('1 fuzzy match')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})

describe('FilterSearchDemo', () => {
  it('renders filter heading', () => {
    render(<FilterSearchDemo />)
    expect(screen.getByText('Filter & Search Panel')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<FilterSearchDemo />)
    expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument()
  })

  it('renders filter pills', () => {
    render(<FilterSearchDemo />)
    expect(screen.getByText('Status: Pending')).toBeInTheDocument()
    expect(screen.getByText('Date: Jan 2024')).toBeInTheDocument()
  })

  it('renders clear all button', () => {
    render(<FilterSearchDemo />)
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('renders advanced filters section', () => {
    render(<FilterSearchDemo />)
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()
    expect(screen.getByText('Amount Range')).toBeInTheDocument()
  })
})
