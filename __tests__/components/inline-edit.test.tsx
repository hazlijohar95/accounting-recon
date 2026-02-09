import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineEditText, InlineEditNumber, SelectionCheckbox } from '@/components/inline-edit'

describe('InlineEditText', () => {
  it('enters edit mode and saves', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<InlineEditText value="Hello" onSave={onSave} />)
    await user.click(screen.getByRole('button'))

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Updated')
    await user.tab()

    expect(onSave).toHaveBeenCalledWith('Updated')
  })
})

describe('InlineEditNumber', () => {
  it('saves numeric value', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<InlineEditNumber value={10} onSave={onSave} />)
    await user.click(screen.getByRole('button'))

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '25')
    await user.tab()

    expect(onSave).toHaveBeenCalledWith(25)
  })
})

describe('SelectionCheckbox', () => {
  it('toggles checked state', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<SelectionCheckbox checked={false} onChange={onChange} ariaLabel="Select" />)
    await user.click(screen.getByLabelText('Select'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
