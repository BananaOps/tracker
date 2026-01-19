interface AzureIconProps {
  className?: string
}

export default function AzureIcon({ className = "w-4 h-4" }: AzureIconProps) {
  return (
    <img 
      src="/azure.png" 
      alt="Azure" 
      className={className}
    />
  )
}
