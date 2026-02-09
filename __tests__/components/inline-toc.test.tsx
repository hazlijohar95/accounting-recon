import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InlineTOC } from '@/components/inline-toc'

describe('InlineTOC', () => {
  it('renders toc items', () => {
    render(
      <InlineTOC defaultOpen items={[{ title: 'Intro', url: '#intro', depth: 1 }]}>
        TOC
      </InlineTOC>
    )

    expect(screen.getByText('TOC')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intro' })).toHaveAttribute('href', '#intro')
  })
})
