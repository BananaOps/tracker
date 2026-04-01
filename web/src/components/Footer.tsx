interface FooterProps {
  isCollapsed?: boolean
}

export default function Footer({ isCollapsed = false }: FooterProps) {
  return (
    <footer
      className={`fixed bottom-0 right-0 border-t border-hud-outline-var/30 z-30 transition-all duration-200 ${
        isCollapsed ? 'left-[56px]' : 'left-[220px]'
      }`}
      style={{ background: 'rgb(var(--hud-surface))' }}
    >
      <style>{`
        @keyframes banana-swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        .banana-animate { display: inline-block; animation: banana-swing 2s ease-in-out infinite; }
      `}</style>
      <div className="px-6 py-2">
        <div className="flex items-center justify-between text-xs text-hud-on-surface-var">
          <span>Made with <span className="banana-animate">🍌</span> by <a href="https://github.com/BananaOps" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-hud-on-surface">BananaOps</a> • <a href="https://github.com/BananaOps/tracker/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-hud-on-surface">Apache 2.0</a></span>
          <div className="flex items-center gap-3">
            <a href="https://github.com/BananaOps/tracker/stargazers" target="_blank" rel="noopener noreferrer" className="hover:text-hud-on-surface">⭐ Star</a>
            <a href="https://github.com/BananaOps/tracker/issues" target="_blank" rel="noopener noreferrer" className="hover:text-hud-on-surface">🐛 Issues</a>
            <a href="https://github.com/BananaOps/tracker/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-hud-on-surface">💬 Discuss</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
