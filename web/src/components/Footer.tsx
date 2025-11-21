import { Star, Bug, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Message principal avec banane animée */}
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            Made with{' '}
            <span className="inline-block animate-bounce text-xl" style={{ animationDuration: '2s' }}>
              🍌
            </span>{' '}
            by the{' '}
            <a
              href="https://github.com/BananaOps"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 dark:from-yellow-300 dark:via-yellow-400 dark:to-orange-400 bg-clip-text text-transparent hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 dark:hover:from-yellow-400 dark:hover:via-orange-400 dark:hover:to-red-400 transition-all duration-300"
            >
              BananaOps
            </a>{' '}
            community
          </p>

          {/* Liens avec icônes colorées */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <a
              href="https://github.com/BananaOps/tracker/stargazers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors group"
            >
              <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 group-hover:fill-yellow-500 dark:group-hover:fill-yellow-400 transition-all" />
              Star us on GitHub
            </a>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            <a
              href="https://github.com/BananaOps/tracker/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-red-500 dark:hover:text-red-400 transition-colors group"
            >
              <Bug className="w-4 h-4 text-red-500 dark:text-red-400 transition-all" />
              Report a Bug
            </a>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            <a
              href="https://github.com/BananaOps/tracker/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group"
            >
              <MessageCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 transition-all" />
              Join Discussion
            </a>
          </div>

          {/* Version et licence */}
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
