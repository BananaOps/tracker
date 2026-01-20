interface KubernetesIconProps {
  className?: string
}

export function KubernetesIcon({ className = "w-4 h-4" }: KubernetesIconProps) {
  return (
    <img 
      src="/kubernetes.png" 
      alt="Kubernetes" 
      className={className}
    />
  )
}
