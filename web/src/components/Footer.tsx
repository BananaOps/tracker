interface FooterProps {
  isCollapsed?: boolean
}

export default function Footer({ isCollapsed = false }: FooterProps) {
  return (
    <footer 
      className={`fixed bottom-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 z-30 transition-all duration-300 ${
        isCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      <style>{`
        @keyframes banana-swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .banana-animate {
          display: inline-block;
          animation: banana-swing 2s ease-in-out infinite;
        }
      `}</style>
      <div className="px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Made with <span className="banana-animate">🍌</span> by <a href="https://github.com/BananaOps" target="_blank" rel="noopener noreferrer" className="hover:underline">BananaOps</a> • <a href="https://github.com/BananaOps/tracker/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:underline">Apache 2.0</a></span>
          <div className="flex items-center gap-3">
            <a href="https://github.com/BananaOps/tracker/stargazers" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300">⭐ Star</a>
            <a href="https://github.com/BananaOps/tracker/issues" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300">🐛 Issues</a>
            <a href="https://github.com/BananaOps/tracker/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300">💬 Discuss</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
