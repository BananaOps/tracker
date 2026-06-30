import { useQueryClient } from '@tanstack/react-query'
import { useCreatePanel } from '../contexts/CreatePanelContext'
import CreateEvent from '../pages/CreateEvent'
import CreateLock from '../pages/CreateLock'
import CreateRpaOperation from '../pages/CreateRpaOperation'
import CreateCatalog from '../pages/CreateCatalog'
import CreateDrift from '../pages/CreateDrift'

export default function CreatePanelHost() {
  const { openPanel, close, notifyCreated } = useCreatePanel()
  const queryClient = useQueryClient()

  if (!openPanel) return null

  const handleSuccess = () => {
    queryClient.invalidateQueries()
    notifyCreated()
    close()
  }

  const shared = { asPanel: true as const, onClose: close, onSuccess: handleSuccess }

  switch (openPanel) {
    case 'event':
      return <CreateEvent {...shared} />
    case 'lock':
      return <CreateLock {...shared} />
    case 'rpa':
      return <CreateRpaOperation {...shared} />
    case 'service':
      return <CreateCatalog {...shared} />
    case 'drift':
      return <CreateDrift {...shared} />
    default:
      return null
  }
}
