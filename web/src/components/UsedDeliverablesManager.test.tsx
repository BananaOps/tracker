import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsedDeliverablesManager from './UsedDeliverablesManager'
import { CatalogType, type UsedDeliverable } from '../types/api'

const initial: UsedDeliverable[] = [{ name: 'base-image', type: CatalogType.CONTAINER, versionUsed: '1.0.0' }]
const available = [{ name: 'base-image', type: CatalogType.CONTAINER }]

// Keeps the list in state like CreateCatalog does, so that a saved edit is rendered.
function Harness({ onUpdate }: { onUpdate: (d: UsedDeliverable[]) => void }) {
  const [deliverables, setDeliverables] = useState(initial)
  return (
    <UsedDeliverablesManager
      usedDeliverables={deliverables}
      availableDeliverables={available}
      onUpdate={(d) => { onUpdate(d); setDeliverables(d) }}
    />
  )
}

describe('UsedDeliverablesManager', () => {
  it('saves an edited version and closes the edit form', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<Harness onUpdate={onUpdate} />)

    await user.click(screen.getByTitle('Edit deliverable'))
    const version = screen.getByPlaceholderText('e.g., 18.2.0, latest, v1.2.3')
    await user.clear(version)
    await user.type(version, '2.0.0')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onUpdate).toHaveBeenCalledWith([{ ...initial[0], versionUsed: '2.0.0' }])
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.getByTitle('Edit deliverable')).toBeInTheDocument()
  })

  it('removes a deliverable', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<Harness onUpdate={onUpdate} />)

    await user.click(screen.getByTitle('Remove deliverable'))
    expect(onUpdate).toHaveBeenCalledWith([])
    expect(screen.getByText('No deliverables tracked yet')).toBeInTheDocument()
  })
})
