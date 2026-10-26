import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TeamContact from './TeamContact'
import { CommunicationType } from '../types/api'

describe('TeamContact', () => {
  it('shows the owner and every communication channel as a link', () => {
    render(
      <TeamContact
        catalog={{
          owner: 'platform-team',
          communicationChannels: [
            { type: CommunicationType.SLACK, name: '#platform', url: 'https://slack.com/app_redirect?channel=platform' },
            { type: CommunicationType.EMAIL, name: 'platform@example.com', url: 'mailto:platform@example.com' },
          ],
        }}
      />,
    )

    expect(screen.getByText('platform-team')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '#platform' })).toHaveAttribute('href', 'https://slack.com/app_redirect?channel=platform')
    expect(screen.getByRole('link', { name: 'platform@example.com' })).toHaveAttribute('href', 'mailto:platform@example.com')
  })

  it('shows only the owner when the entry has no channel', () => {
    render(<TeamContact catalog={{ owner: 'platform-team' }} />)
    expect(screen.getByText('platform-team')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
