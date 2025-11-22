import { Coffee, Heart } from 'lucide-react'

// Déclaration du type pour la config globale
declare global {
  interface Window {
    TRACKER_CONFIG?: {
      demoMode?: boolean
      buyMeCoffeeUrl?: string
    }
  }
}

export default function DemoBanner() {
  // Vérifier si le mode démo est activé (runtime config ou env var)
  const isDemoMode = 
    window.TRACKER_CONFIG?.demoMode || 
    import.meta.env.VITE_DEMO_MODE === 'true'
  
  const buyMeCoffeeUrl = 
    window.TRACKER_CONFIG?.buyMeCoffeeUrl || 
    import.meta.env.VITE_BUY_ME_COFFEE_URL || 
    'https://www.buymeacoffee.com/bananaops'

  if (!isDemoMode) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 dark:from-yellow-500 dark:via-orange-500 dark:to-red-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Message de démo */}
          <div className="flex items-center gap-2 text-white font-medium">
            <span className="text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
              🍌
            </span>
            <span className="text-sm sm:text-base">
              This is a <strong>demo instance</strong> of Tracker - Try it out!
            </span>
          </div>

          {/* Bouton Buy Me a Coffee */}
          <a
            href={buyMeCoffeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
          >
            <Coffee className="w-5 h-5 text-orange-500 group-hover:animate-bounce" />
            <span className="text-sm sm:text-base">Buy me a coffee</span>
            <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
          </a>
        </div>
      </div>
    </div>
  )
}
