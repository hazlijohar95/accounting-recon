import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Accordions, Accordion } from '@/components/accordion'

vi.mock('fumadocs-ui/utils/use-copy-button', () => ({
  useCopyButton: () => [false, vi.fn()],
}))

describe('Accordions', () => {
  it('renders accordion item and copy button when id is provided', () => {
    render(
      <Accordions type="single" defaultValue="Title">
        <Accordion id="section" title="Title">
          Content
        </Accordion>
      </Accordions>
    )

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy Link')).toBeInTheDocument()
  })
})
