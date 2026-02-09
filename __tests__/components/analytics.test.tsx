import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/dynamic', () => ({
  default: () => () => <div>Analytics</div>,
}))

import { Analytics } from '@/components/analytics'

describe('Analytics', () => {
  it('renders analytics component', () => {
    render(<Analytics />)
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })
})
