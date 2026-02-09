import { describe, expect, it, vi } from 'vitest'
import { render, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

function renderTabs(groupId?: string) {
  return render(
    <div>
      <Tabs groupId={groupId} persist updateAnchor defaultValue="one" data-testid="tabs-a">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one" id="section-one" forceMount>
          Content One
        </TabsContent>
        <TabsContent value="two" id="section-two" forceMount>
          Content Two
        </TabsContent>
      </Tabs>
      <Tabs groupId={groupId} persist defaultValue="one" data-testid="tabs-b">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one" forceMount>
          Other One
        </TabsContent>
        <TabsContent value="two" forceMount>
          Other Two
        </TabsContent>
      </Tabs>
    </div>
  )
}

describe('Tabs', () => {
  it('syncs groupId changes and persists state', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    sessionStorage.clear()
    localStorage.clear()
    const { getByTestId } = renderTabs('group-1')
    const user = userEvent.setup()

    const tabsA = within(getByTestId('tabs-a'))
    const tabsB = within(getByTestId('tabs-b'))

    await user.click(tabsA.getByText('Two'))

    await waitFor(() => {
      expect(sessionStorage.getItem('group-1')).toBe('two')
      expect(localStorage.getItem('group-1')).toBe('two')
    })
    expect(tabsB.getByText('Other Two')).toBeInTheDocument()
  })

  it('updates URL hash when updateAnchor is true', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    window.location.hash = ''
    sessionStorage.clear()
    localStorage.clear()
    const { getByTestId } = renderTabs('group-2')
    const user = userEvent.setup()
    const tabsA = within(getByTestId('tabs-a'))

    await user.click(tabsA.getByText('Two'))
    await waitFor(() => {
      expect(window.location.hash).toBe('#section-two')
    })
  })
})
