import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/theme-toggle'

const setTheme = vi.fn()
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme }),
}))

describe('ThemeToggle', () => {
  it('renders buttons after mount and sets theme', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    const lightButton = await screen.findByTitle('Light mode')
    expect(lightButton).toBeInTheDocument()

    await user.click(screen.getByTitle('Dark mode'))
    expect(setTheme).toHaveBeenCalledWith('dark')

    await user.click(screen.getByTitle('System preference'))
    expect(setTheme).toHaveBeenCalledWith('system')
  })
})
