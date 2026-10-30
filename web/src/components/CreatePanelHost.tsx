import { useQueryClient } from '@tanstack/react-query'
import { useCreatePanel } from '../contexts/createPanel'
import { lazy, Suspense } from 'react'

const CreateEvent = lazy(() => import('../pages/CreateEvent'))
const CreateLock = lazy(() => import('../pages/CreateLock'))
const CreateRpaOperation = lazy(() => import('../pages/CreateRpaOperation'))
const CreateCatalog = lazy(() => import('../pages/CreateCatalog'))
const CreateDrift = lazy(() => import('../pages/CreateDrift'))

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

  return <Suspense fallback={null}>{panel()}</Suspense>

  function panel() {
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
}
