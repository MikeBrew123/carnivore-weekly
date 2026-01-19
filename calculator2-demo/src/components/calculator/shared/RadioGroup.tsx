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
      <legend
        style={{
          display: 'block',
          color: '#FFFFFF',
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
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              required={required}
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
