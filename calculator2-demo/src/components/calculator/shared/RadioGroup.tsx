import { ReactNode } from 'react'

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  name: string
  label: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  helpText?: string
}

export default function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  required,
  helpText,
}: RadioGroupProps) {
  return (
    <fieldset className="w-full">
      <legend className="block text-sm font-medium text-gray-700 mb-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </legend>

      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-start cursor-pointer group">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
              required={required}
            />
            <div className="ml-3 flex-1">
              <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helpText}</p>
      )}
    </fieldset>
  )
}
