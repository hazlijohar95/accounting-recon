import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'

describe('ThemeProvider', () => {
  it('renders children', () => {
    render(
      <ThemeProvider attribute="class">
        <div>Content</div>
      </ThemeProvider>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
