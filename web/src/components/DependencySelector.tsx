import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
        <label className="block text-sm font-medium text-hud-on-surface-var mb-2">
          {label}
        </label>
      )}
      
      <div className="flex space-x-2">
        {/* Input with dropdown */}
        <div className="flex-1 relative">
          <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-hud-on-surface-var" />
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
              className="w-full pl-9 pr-10 py-2 text-sm border border-hud-outline-var rounded-lg bg-hud-surface text-hud-on-surface placeholder:text-hud-on-surface-var/60 focus:ring-2 focus:ring-hud-primary/20 focus:border-hud-primary"
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-hud-on-surface-var hover:text-hud-on-surface transition-colors"
            >
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-hud-surface border border-hud-outline-var/60 rounded-lg shadow-lg max-h-60 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {/* Existing services */}
                {filteredServices.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-hud-on-surface-var bg-hud-surface-low">
                      Existing Services
                    </div>
                    {filteredServices.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => handleSelect(service)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-hud-surface-high transition-colors flex items-center justify-between ${
                          service === value
                            ? 'bg-hud-primary/10 text-hud-primary'
                            : 'text-hud-on-surface'
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
                      <div className="border-t border-hud-outline-var/60" />
                    )}
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center space-x-2 text-green-700 dark:text-green-300"
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Add "{search.trim()}"</span>
                    </button>
                  </>
                )}

                {/* No results */}
                {filteredServices.length === 0 && !search.trim() && (
                  <div className="px-3 py-2 text-sm text-hud-on-surface-var text-center">
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
          className="px-3 py-2 bg-hud-primary text-white rounded-lg hover:bg-hud-primary-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-1 text-xs text-hud-on-surface-var">
        Select from existing services or type a custom name
      </p>
    </div>
  )
}
