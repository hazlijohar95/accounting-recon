import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heading } from '@/components/heading'

describe('Heading', () => {
  it('renders without anchor when no id', () => {
    render(<Heading>Title</Heading>)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders anchor link when id is provided', () => {
    render(
      <Heading as="h2" id="section-1">
        Section
      </Heading>
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '#section-1')
  })
})
