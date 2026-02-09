import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Banner } from '@/components/banner'

describe('Banner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders and can be dismissed', () => {
    render(
      <Banner id="welcome" height="4rem">
        Hello
      </Banner>
    )

    expect(screen.getByText('Hello')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Close Banner'))

    expect(localStorage.getItem('nd-banner-welcome')).toBe('true')
  })

  it('respects stored dismissal state', () => {
    localStorage.setItem('nd-banner-welcome', 'true')
    render(
      <Banner id="welcome">
        Hello
      </Banner>
    )

    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })
})
