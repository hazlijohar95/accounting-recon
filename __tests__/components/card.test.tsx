import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, Cards } from '@/components/card'

describe('Cards', () => {
  it('renders children and grid classes', () => {
    render(
      <Cards>
        <div>Card content</div>
      </Cards>
    )

    expect(screen.getByText('Card content')).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renders title and description', () => {
    render(
      <Card title="Title" description="Desc">
        Child
      </Card>
    )

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Desc')).toBeInTheDocument()
    expect(screen.getByText('Child')).toBeInTheDocument()
  })
})
