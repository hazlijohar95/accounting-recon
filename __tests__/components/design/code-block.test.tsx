import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeBlock } from '@/app/(main)/design/_components/code-block'

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders the code content', () => {
    render(<CodeBlock code="const x = 1" />)

    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('renders the language label when provided', () => {
    render(<CodeBlock code="const x = 1" language="tsx" />)

    expect(screen.getByText('tsx')).toBeInTheDocument()
  })

  it('defaults to tsx language label', () => {
    render(<CodeBlock code="const x = 1" />)

    expect(screen.getByText('tsx')).toBeInTheDocument()
  })

  it('renders code as pre element without line numbers by default', () => {
    const { container } = render(<CodeBlock code="line one&#10;line two" />)

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre?.textContent).toContain('line one')
    expect(pre?.textContent).toContain('line two')
  })

  it('renders line numbers when showLineNumbers is true', () => {
    const { container } = render(<CodeBlock code={'first\nsecond\nthird'} showLineNumbers />)

    // Line numbers should be in table cells
    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()

    // Should contain the code lines
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.getByText('second')).toBeInTheDocument()
    expect(screen.getByText('third')).toBeInTheDocument()
  })

  it('renders a copy button', () => {
    const { container } = render(<CodeBlock code="test code" />)

    const copyButton = container.querySelector('button')
    expect(copyButton).toBeInTheDocument()
  })

  it('copies code to clipboard when copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator.clipboard, { writeText })

    const { container } = render(<CodeBlock code="test code" />)

    const copyButton = container.querySelector('button')!
    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('test code')
  })

  it('applies custom className', () => {
    const { container } = render(
      <CodeBlock code="test" className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('uses monospace font for code display', () => {
    const { container } = render(<CodeBlock code="test" />)

    const codeWrapper = container.querySelector('.font-mono')
    expect(codeWrapper).toBeInTheDocument()
  })
})
