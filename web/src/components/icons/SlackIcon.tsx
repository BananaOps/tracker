interface SlackIconProps {
  className?: string
}

export default function SlackIcon({ className = "w-4 h-4" }: SlackIconProps) {
  return (
    <img 
      src="/slack.svg" 
      alt="Slack" 
      className={className}
    />
  )
}
