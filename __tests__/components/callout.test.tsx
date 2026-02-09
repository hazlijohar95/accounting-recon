import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Callout, CalloutContainer } from '@/components/callout'

describe('Callout', () => {
  it('renders title and description', () => {
    render(<Callout title="Heads up">Message</Callout>)

    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('maps warn alias to warning styles', () => {
    const { container } = render(
      <CalloutContainer type="warn">Alert</CalloutContainer>
    )

    expect(container.firstChild).toHaveClass('border-l-amber-500')
  })
})
