import { useState, useRef, useEffect } from 'react'
import { Input } from './ui/input'
import { ChevronDown } from 'lucide-react'

interface ServiceAutocompleteProps {
  value: string
  onChange: (value: string) => void
  services: string[]
  loading?: boolean
  required?: boolean
  placeholder?: string
  id?: string
}

export default function ServiceAutocomplete({
  value,
  onChange,
  services,
  loading = false,
  required = false,
  placeholder = 'Type to search or select a service',
  id = 'service'
}: ServiceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredServices, setFilteredServices] = useState<string[]>(services)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Filtrer les services en fonction de la saisie
  useEffect(() => {
    if (value) {
      const filtered = services.filter(service =>
        service.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredServices(filtered)
    } else {
      setFilteredServices(services)
    }
  }, [value, services])

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setIsOpen(true)
  }

  const handleSelectService = (service: string) => {
    onChange(service)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          disabled={loading}
          className="pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          disabled={loading}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && services.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredServices.length > 0 ? (
            <ul className="py-1">
              {filteredServices.map((service) => (
                <li key={service}>
                  <button
                    type="button"
                    onClick={() => handleSelectService(service)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    {service}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No services found matching "{value}"
            </div>
          )}
        </div>
      )}

      {loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Loading services...
        </p>
      )}
    </div>
  )
}

