import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

describe('Collapsible', () => {
  it('renders content when open', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
