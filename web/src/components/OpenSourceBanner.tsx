import { useState } from 'react'
import { X, Github, Heart } from 'lucide-react'

export default function OpenSourceBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    // Vérifier si l'utilisateur a déjà fermé la bannière
    return localStorage.getItem('openSourceBannerDismissed') !== 'true'
  })

  const handleDismiss = () => {
    localStorage.setItem('openSourceBannerDismissed', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3 flex-1">
            <Github className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
              <span>This is an open source project!</span>
              <span className="hidden sm:inline flex items-center gap-1">
                Star us on GitHub
                <Heart className="w-4 h-4 inline fill-current" />
              </span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <a
              href="https://github.com/BananaOps/tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-1.5 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
            </a>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
