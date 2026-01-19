interface GcpIconProps {
  className?: string
}

export default function GcpIcon({ className = "w-4 h-4" }: GcpIconProps) {
  return (
    <img 
      src="/gcp.svg" 
      alt="Google Cloud Platform" 
      className={className}
    />
  )
}
