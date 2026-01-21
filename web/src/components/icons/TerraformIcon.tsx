interface TerraformIconProps {
  className?: string
}

export function TerraformIcon({ className = "w-4 h-4" }: TerraformIconProps) {
  return (
    <img 
      src="/terraform.svg" 
      alt="Terraform" 
      className={className}
    />
  )
}
