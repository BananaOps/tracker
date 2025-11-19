import { Github, Star } from 'lucide-react'

/**
 * Version minimaliste de la bannière open source
 * Affichée en permanence dans le footer ou en haut
 */
export default function OpenSourceBannerMinimal() {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            Open Source Project
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <a
            href="https://github.com/BananaOps/tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
