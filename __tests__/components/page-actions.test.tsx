import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LLMCopyButton, ViewOptions } from '@/components/page-actions'

const onCopy = vi.fn()
vi.mock('fumadocs-ui/utils/use-copy-button', () => ({
  useCopyButton: () => [false, onCopy],
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('LLMCopyButton', () => {
  it('invokes copy handler', async () => {
    const user = userEvent.setup()
    render(<LLMCopyButton markdownUrl="/docs/page.md" />)

    await user.click(screen.getByRole('button', { name: /Copy Markdown/ }))
    expect(onCopy).toHaveBeenCalled()
  })
})

describe('ViewOptions', () => {
  it('renders action links', () => {
    render(
      <ViewOptions
        markdownUrl="/docs/page.md"
        githubUrl="https://github.com/acme/demo"
      />
    )

    expect(screen.getByRole('link', { name: /Open in GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/acme/demo'
    )
    expect(screen.getByRole('link', { name: /Open in Claude/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://claude.ai/new?')
    )
  })
})
