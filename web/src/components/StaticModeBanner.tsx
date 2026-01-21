import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMetadata } from '../lib/staticApi'

export default function StaticModeBanner() {
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true'

  useEffect(() => {
    // Only fetch metadata if we're in static mode
    if (!isStaticMode) return
    
    const fetchMetadata = async () => {
      try {
        const metadata = await getMetadata()
        setLastUpdate(metadata.lastUpdate)
      } catch (err) {
        console.error('Failed to fetch metadata:', err)
      }
    }
    fetchMetadata()
  }, [isStaticMode])
  
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
