import { useEffect } from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error'

interface ToastProps {
  message: string
  onClose: () => void
  duration?: number
  variant?: ToastVariant
}

const styles: Record<ToastVariant, { box: string; close: string }> = {
  success: { box: 'bg-green-600', close: 'hover:text-green-100' },
  error: { box: 'bg-red-600', close: 'hover:text-red-100' },
}

export default function Toast({ message, onClose, duration = 3000, variant = 'success' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const Icon = variant === 'error' ? AlertCircle : CheckCircle

  return (
    <div className="fixed top-4 right-4 z-[60] animate-slide-in" role={variant === 'error' ? 'alert' : 'status'}>
      <div className={`${styles[variant].box} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px]`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 font-medium">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className={`text-white ${styles[variant].close} transition-colors`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
