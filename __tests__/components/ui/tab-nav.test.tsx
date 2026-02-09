import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabNav, TabPanel } from '@/components/ui/tab-nav'

const tabs = [
  { id: 'pending', label: 'Pending', count: 2 },
  { id: 'matched', label: 'Matched' },
] as const

describe('TabNav', () => {
  it('renders tabs and handles click', () => {
    const onTabChange = vi.fn()

    render(
      <TabNav
        tabs={[...tabs]}
        activeTab="pending"
        onTabChange={onTabChange}
        ariaLabel="Status tabs"
      />
    )

    expect(screen.getByRole('tablist', { name: 'Status tabs' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Pending/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: /Matched/ }))
    expect(onTabChange).toHaveBeenCalledWith('matched')
  })

  it('supports keyboard navigation', () => {
    const onTabChange = vi.fn()

    render(
      <TabNav
        tabs={[...tabs]}
        activeTab="pending"
        onTabChange={onTabChange}
        variant="pill"
      />
    )

    const pendingTab = screen.getByRole('tab', { name: /Pending/ })
    pendingTab.focus()
    fireEvent.keyDown(pendingTab, { key: 'ArrowRight' })

    expect(onTabChange).toHaveBeenCalledWith('matched')
  })
})

describe('TabPanel', () => {
  it('renders only active panel', () => {
    const { rerender } = render(
      <TabPanel tabId="pending" activeTab="pending">
        Pending content
      </TabPanel>
    )

    expect(screen.getByText('Pending content')).toBeInTheDocument()

    rerender(
      <TabPanel tabId="pending" activeTab="matched">
        Pending content
      </TabPanel>
    )

    expect(screen.queryByText('Pending content')).not.toBeInTheDocument()
  })
})
