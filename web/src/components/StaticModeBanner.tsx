import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMetadata } from '../lib/staticApi'

export default function StaticModeBanner() {
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = await getMetadata()
        setLastUpdate(metadata.lastUpdate)
      } catch (err) {
        console.error('Failed to fetch metadata:', err)
      }
    }
    fetchMetadata()
  }, [])

  const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true'
  
  if (!isStaticMode) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span>
        📊 Static Demo Mode - Read-only data
        {lastUpdate && ` - Last updated: ${new Date(lastUpdate).toLocaleDateString()}`}
      </span>
    </div>
  )
}
