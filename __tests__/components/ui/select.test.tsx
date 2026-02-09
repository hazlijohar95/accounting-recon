import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '@/components/ui/select'

const options = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
]

describe('Select', () => {
  it('opens, selects option, and closes', async () => {
    const onChange = vi.fn()
    render(<Select value="" onChange={onChange} options={options} placeholder="Pick" />)

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('One')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Two'))
    expect(onChange).toHaveBeenCalledWith('two')
    expect(screen.queryByText('One')).not.toBeInTheDocument()
  })

  it('closes on escape and outside click', async () => {
    const onChange = vi.fn()
    render(<Select value="" onChange={onChange} options={options} />)

    await userEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('One')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Two')).not.toBeInTheDocument()
  })
})
