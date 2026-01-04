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
      <legend
        style={{
          display: 'block',
          color: '#a0a0a0',
          fontFamily: "'Merriweather', Georgia, serif",
          fontSize: '16px',
          fontWeight: '500',
          marginBottom: '12px'
        }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </legend>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map((option) => (
          <label key={option.value} style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '12px' }}>
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={() => toggleValue(option.value)}
              required={required && values.length === 0}
              style={{
                marginTop: '4px',
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#ffd700'
              }}
            />
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#f5f5f5',
                  fontFamily: "'Merriweather', Georgia, serif"
                }}
              >
                {option.label}
              </span>
              {option.description && (
                <p style={{ fontSize: '14px', color: '#a0a0a0', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>
                  {option.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px', marginTop: '8px' }}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p style={{ color: '#666', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px', marginTop: '8px' }}>
          {helpText}
        </p>
      )}
    </fieldset>
  )
}
