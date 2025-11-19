import { Heart, Star, Bug, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Message principal */}
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> by the{' '}
            <a
              href="https://github.com/BananaOps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              BananaOps
            </a>{' '}
            community
          </p>

          {/* Liens */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <a
              href="https://github.com/BananaOps/tracker/stargazers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Star className="w-4 h-4" />
              Star us on GitHub
            </a>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            <a
              href="https://github.com/BananaOps/tracker/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Bug className="w-4 h-4" />
              Report a Bug
            </a>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            <a
              href="https://github.com/BananaOps/tracker/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Join Discussion
            </a>
          </div>

          {/* Version et licence (optionnel) */}
          <div className="text-xs text-gray-500 dark:text-gray-500">
            <a
              href="https://github.com/BananaOps/tracker/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Apache 2.0 License
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
