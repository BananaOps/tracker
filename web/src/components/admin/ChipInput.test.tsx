import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipInput } from './ChipInput'

describe('ChipInput', () => {
  it('adds trimmed unique values on Enter and comma', async () => {
    const onChange = vi.fn()
    render(<ChipInput id="groups" values={['ops']} onChange={onChange} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox'), '  platform {Enter}')
    expect(onChange).toHaveBeenLastCalledWith(['ops', 'platform'])
    await user.type(screen.getByRole('textbox'), 'ops,')
    expect(onChange).toHaveBeenLastCalledWith(['ops'])
  })

  it('removes a value from its chip', async () => {
    const onChange = vi.fn()
    render(<ChipInput id="groups" values={['ops', 'platform']} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove ops' }))
    expect(onChange).toHaveBeenCalledWith(['platform'])
  })
})
