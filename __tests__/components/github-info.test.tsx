import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GithubInfo } from '@/components/github-info'

describe('GithubInfo', () => {
  it('renders repository info with stars', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stargazers_count: 1500, forks_count: 20 }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const element = await GithubInfo({ owner: 'acme', repo: 'demo' })
    render(element)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://github.com/acme/demo')
    expect(screen.getByText('1.5K')).toBeInTheDocument()
  })

  it('throws when fetch fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Not found',
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(GithubInfo({ owner: 'acme', repo: 'demo' })).rejects.toThrow(
      'Failed to fetch repository data: Not found'
    )
  })
})
