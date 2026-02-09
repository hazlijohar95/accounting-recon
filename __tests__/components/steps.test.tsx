import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Step, Steps } from '@/components/steps'

describe('Steps', () => {
  it('renders step content', () => {
    render(
      <Steps>
        <Step>Step one</Step>
      </Steps>
    )

    expect(screen.getByText('Step one')).toBeInTheDocument()
  })
})
