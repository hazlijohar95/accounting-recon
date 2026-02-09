import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CodeBlock, Pre, CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger, CodeBlockTab } from '@/components/codeblock'

vi.mock('fumadocs-ui/utils/use-copy-button', () => ({
  useCopyButton: () => [false, vi.fn()],
}))

describe('CodeBlock', () => {
  it('renders title and copy button', () => {
    render(
      <CodeBlock title="Example">
        <Pre>code</Pre>
      </CodeBlock>
    )

    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy Text')).toBeInTheDocument()
  })

  it('renders tabbed code blocks', () => {
    render(
      <CodeBlockTabs defaultValue="one">
        <CodeBlockTabsList>
          <CodeBlockTabsTrigger value="one">One</CodeBlockTabsTrigger>
        </CodeBlockTabsList>
        <CodeBlockTab value="one">
          <CodeBlock title="Example">
            <Pre>code</Pre>
          </CodeBlock>
        </CodeBlockTab>
      </CodeBlockTabs>
    )

    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
  })
})
