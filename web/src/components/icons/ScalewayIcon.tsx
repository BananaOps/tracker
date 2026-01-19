interface ScalewayIconProps {
  className?: string
}

export default function ScalewayIcon({ className = "w-4 h-4" }: ScalewayIconProps) {
  return (
    <img 
      src="/scaleway.png" 
      alt="Scaleway" 
      className={className}
    />
  )
}
