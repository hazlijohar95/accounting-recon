import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { CommandBlock } from '@/app/(main)/design/_components/command-block'

describe('CommandBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders the label', () => {
    render(<CommandBlock label="Install" command="npm install" />)

    expect(screen.getByText('Install')).toBeInTheDocument()
  })

  it('renders the command', () => {
    render(<CommandBlock label="Install" command="npm install" />)

    expect(screen.getByText('npm install')).toBeInTheDocument()
  })

  it('renders the command in a code element', () => {
    const { container } = render(
      <CommandBlock label="Run" command="pnpm dev" />
    )

    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
    expect(codeEl?.textContent).toBe('pnpm dev')
  })

  it('renders copy button with initial text', () => {
    render(<CommandBlock label="Test" command="echo hello" />)

    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('copies command to clipboard when copy is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator.clipboard, { writeText })

    render(<CommandBlock label="Build" command="pnpm build" />)

    fireEvent.click(screen.getByText('Copy'))
    expect(writeText).toHaveBeenCalledWith('pnpm build')
  })

  it('shows "Copied!" after clicking copy', () => {
    render(<CommandBlock label="Build" command="pnpm build" />)

    fireEvent.click(screen.getByText('Copy'))
    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('resets copy text after 2 seconds', async () => {
    render(<CommandBlock label="Build" command="pnpm build" />)

    fireEvent.click(screen.getByText('Copy'))
    expect(screen.getByText('Copied!')).toBeInTheDocument()

    // Use act to flush the setTimeout state update
    await act(async () => {
      vi.advanceTimersByTime(2100)
    })

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('renders command in a pre element for monospace display', () => {
    const { container } = render(
      <CommandBlock label="Deploy" command="npx convex deploy" />
    )

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre).toHaveClass('font-mono')
  })

  it('renders with border styling', () => {
    const { container } = render(
      <CommandBlock label="Test" command="pnpm test" />
    )

    expect(container.firstChild).toHaveClass('border')
    expect(container.firstChild).toHaveClass('border-border')
  })
})
