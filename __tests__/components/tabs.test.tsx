import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tabs, Tab, TabsContent } from '@/components/tabs'

describe('Tabs', () => {
  it('renders items and content', () => {
    render(
      <Tabs items={['One', 'Two']} defaultIndex={0}>
        <Tab>First</Tab>
        <Tab>Second</Tab>
      </Tabs>
    )

    expect(screen.getByRole('tab', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
  })

  it('renders TabsContent with explicit value', () => {
    render(
      <Tabs defaultValue="one">
        <TabsContent value="one">Content</TabsContent>
      </Tabs>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
