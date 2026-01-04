interface CheckboxOption {
  value: string
  label: string
  description?: string
}

interface CheckboxGroupProps {
  name: string
  label: string
  options: CheckboxOption[]
  values: string[]
  onChange: (values: string[]) => void
  error?: string
  required?: boolean
  helpText?: string
}

export default function CheckboxGroup({
  name,
  label,
  options,
  values,
  onChange,
  error,
  required,
  helpText,
}: CheckboxGroupProps) {
  const toggleValue = (value: string) => {
    const newValues = values.includes(value)
      ? values.filter(v => v !== value)
      : [...values, value]
    onChange(newValues)
  }

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
              type="checkbox"
              name={name}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={() => toggleValue(option.value)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              required={required && values.length === 0}
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
