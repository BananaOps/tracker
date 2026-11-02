interface FooterProps {
  isCollapsed?: boolean
}

const link = 'text-muted hover:text-ink hover:underline underline-offset-2'

export default function Footer({ isCollapsed = false }: FooterProps) {
  return (
    <footer
      className={`fixed right-0 bottom-0 z-30 border-t border-rule bg-surface transition-[left] duration-[180ms] ease-ds ${
        isCollapsed ? 'left-[60px]' : 'left-sidebar-w'
      }`}
    >
      <div className="flex items-center justify-between px-space-6 py-2 font-mono text-[11px] text-muted">
        <span>
          made by{' '}
          <a href="https://github.com/BananaOps" target="_blank" rel="noopener noreferrer" className={link}>
            BananaOps
          </a>{' '}
          ·{' '}
          <a href="https://github.com/BananaOps/tracker/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className={link}>
            Apache 2.0
          </a>
        </span>
        <span className="flex items-center gap-space-3">
          <a href="https://github.com/BananaOps/tracker/stargazers" target="_blank" rel="noopener noreferrer" className={link}>
            star
          </a>
          <a href="https://github.com/BananaOps/tracker/issues" target="_blank" rel="noopener noreferrer" className={link}>
            issues
          </a>
          <a href="https://github.com/BananaOps/tracker/discussions" target="_blank" rel="noopener noreferrer" className={link}>
            discuss
          </a>
        </span>
      </div>
    </footer>
  )
}
