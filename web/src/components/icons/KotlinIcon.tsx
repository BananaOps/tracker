interface KotlinIconProps {
  className?: string
}

export default function KotlinIcon({ className = "w-4 h-4" }: KotlinIconProps) {
  return (
    <img 
      src="/src/assets/kotlin.svg" 
      alt="Kotlin" 
      className={className}
    />
  )
}
