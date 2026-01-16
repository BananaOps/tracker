interface GrafanaIconProps {
  className?: string
}

export default function GrafanaIcon({ className = "w-4 h-4" }: GrafanaIconProps) {
  return (
    <img 
      src="/src/assets/grafana.svg" 
      alt="Grafana" 
      className={className}
    />
  )
}
