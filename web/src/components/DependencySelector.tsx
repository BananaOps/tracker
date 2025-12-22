import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search, Plus } from 'lucide-react'

interface DependencySelectorProps {
  availableServices: string[]
  value: string
  onChange: (value: string) => void
  onAdd: () => void
  placeholder?: string
  label?: string
  className?: string
}

export default function DependencySelector({
  availableServices,
  value,
  onChange,
  onAdd,
  placeholder = 'Select or type a service name...',
  label,
  className = ''
}: DependencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter services based on search
  const filteredServices = availableServices.filter(service =>
    service.toLowerCase().includes(search.toLowerCase())
  )

  // Check if search matches an existing service
  const exactMatch = availableServices.some(
    service => service.toLowerCase() === search.toLowerCase()
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (serviceName: string) => {
    onChange(serviceName)
    setSearch('')
    setIsOpen(false)
  }

  const handleAddCustom = () => {
    if (search.trim()) {
      onChange(search.trim())
      setSearch('')
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (search.trim()) {
        // If there's an exact match, select it
        if (exactMatch) {
          const matchedService = availableServices.find(
            s => s.toLowerCase() === search.toLowerCase()
          )
          if (matchedService) {
            handleSelect(matchedService)
          }
        } else {
          // Otherwise add as custom
          handleAddCustom()
        }
      } else if (value.trim()) {
        // If input is empty but we have a value, add it
        onAdd()
      }
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="flex space-x-2">
        {/* Input with dropdown */}
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={isOpen ? search : value}
              onChange={(e) => {
                setSearch(e.target.value)
                onChange(e.target.value)
                if (!isOpen) setIsOpen(true)
              }}
              onFocus={() => {
                setIsOpen(true)
                setSearch(value)
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {/* Existing services */}
                {filteredServices.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                      Existing Services
                    </div>
                    {filteredServices.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => handleSelect(service)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                          service === value
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <span className="truncate">{service}</span>
                        {service === value && (
                          <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Custom entry option */}
                {search.trim() && !exactMatch && (
                  <>
                    {filteredServices.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700" />
                    )}
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center space-x-2 text-green-600 dark:text-green-400"
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Add "{search.trim()}"</span>
                    </button>
                  </>
                )}

                {/* No results */}
                {filteredServices.length === 0 && !search.trim() && (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Type to search or add a custom service
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={onAdd}
          disabled={!value.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Select from existing services or type a custom name
      </p>
    </div>
  )
}
