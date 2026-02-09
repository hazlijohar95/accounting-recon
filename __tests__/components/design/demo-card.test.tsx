import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DemoCard } from '@/app/(main)/design/_components/demo-card'

describe('DemoCard', () => {
  it('renders title and description', () => {
    render(
      <DemoCard title="Test Title" description="Test description">
        <div>content</div>
      </DemoCard>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders children in the preview area', () => {
    render(
      <DemoCard title="Demo" description="desc">
        <span data-testid="child">Hello</span>
      </DemoCard>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('does not render replay button when onReplay is not provided', () => {
    render(
      <DemoCard title="Demo" description="desc">
        <div>content</div>
      </DemoCard>
    )

    expect(screen.queryByText('Replay')).not.toBeInTheDocument()
  })

  it('renders replay button when onReplay is provided', () => {
    const onReplay = vi.fn()
    render(
      <DemoCard title="Demo" description="desc" onReplay={onReplay}>
        <div>content</div>
      </DemoCard>
    )

    expect(screen.getByText('Replay')).toBeInTheDocument()
  })

  it('calls onReplay when replay button is clicked', () => {
    const onReplay = vi.fn()
    render(
      <DemoCard title="Demo" description="desc" onReplay={onReplay}>
        <div>content</div>
      </DemoCard>
    )

    fireEvent.click(screen.getByText('Replay'))
    expect(onReplay).toHaveBeenCalledTimes(1)
  })

  it('applies feature variant classes by default', () => {
    const { container } = render(
      <DemoCard title="Demo" description="desc">
        <div>content</div>
      </DemoCard>
    )

    const previewArea = container.querySelector('.bg-muted\\/30')
    expect(previewArea).toBeInTheDocument()
    expect(previewArea).toHaveClass('min-h-[200px]')
  })

  it('applies animation variant classes', () => {
    const { container } = render(
      <DemoCard title="Demo" description="desc" variant="animation">
        <div>content</div>
      </DemoCard>
    )

    const previewArea = container.querySelector('.aspect-square')
    expect(previewArea).toBeInTheDocument()
  })

  it('applies 3d variant classes', () => {
    const { container } = render(
      <DemoCard title="Demo" description="desc" variant="3d">
        <div>content</div>
      </DemoCard>
    )

    const previewArea = container.querySelector('.min-h-\\[300px\\]')
    expect(previewArea).toBeInTheDocument()
  })

  it('applies custom className to outer container', () => {
    const { container } = render(
      <DemoCard title="Demo" description="desc" className="custom-test-class">
        <div>content</div>
      </DemoCard>
    )

    expect(container.firstChild).toHaveClass('custom-test-class')
  })

  it('wraps content with border styling', () => {
    const { container } = render(
      <DemoCard title="Demo" description="desc">
        <div>content</div>
      </DemoCard>
    )

    expect(container.firstChild).toHaveClass('border')
    expect(container.firstChild).toHaveClass('border-border')
  })
})
