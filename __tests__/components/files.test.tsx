import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Files, File, Folder } from '@/components/files'

describe('Files', () => {
  it('renders children', () => {
    render(
      <Files>
        <div>Content</div>
      </Files>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('File', () => {
  it('renders file name', () => {
    render(<File name="readme.md" />)
    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })
})

describe('Folder', () => {
  it('renders folder and children when open', () => {
    render(
      <Folder name="docs" defaultOpen>
        <File name="intro.md" />
      </Folder>
    )

    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('intro.md')).toBeInTheDocument()
  })

  it('toggles open state', async () => {
    const user = userEvent.setup()
    render(
      <Folder name="docs">
        <File name="intro.md" />
      </Folder>
    )

    expect(screen.queryByText('intro.md')).not.toBeInTheDocument()
    await user.click(screen.getByText('docs'))
    expect(screen.getByText('intro.md')).toBeInTheDocument()
  })
})
