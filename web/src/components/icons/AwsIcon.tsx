interface AwsIconProps {
  className?: string
  darkMode?: boolean
}

export default function AwsIcon({ className = "w-4 h-4", darkMode = false }: AwsIconProps) {
  return (
    <img 
      src={darkMode ? "/aws-dark-mode.png" : "/aws-light-mode.png"}
      alt="AWS" 
      className={className}
    />
  )
}
