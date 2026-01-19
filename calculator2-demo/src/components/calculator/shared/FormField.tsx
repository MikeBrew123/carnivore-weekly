import { InputHTMLAttributes, ReactNode, useState } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helpText?: string
  icon?: ReactNode
  isValid?: boolean // New: explicit valid state for green glow
}

export default function FormField({
  label,
  error,
  helpText,
  icon,
  isValid,
  className = '',
  ...props
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Determine border color: error (red) > valid (green) > default (gray)
  const getBorderColor = () => {
    if (error) return '#ef4444'
    if (isValid) return '#22c55e' // green-500
    return '#333'
  }

  // Determine glow: focus (gold) > valid (green) > error (red) > none
  const getBoxShadow = () => {
    if (isFocused) return '0 0 0 3px rgba(255, 215, 0, 0.2)'
    if (isValid) return '0 0 0 2px rgba(34, 197, 94, 0.15)' // subtle green glow
    if (error) return '0 0 0 2px rgba(239, 68, 68, 0.15)' // subtle red glow
    return 'none'
  }

  return (
    <div className="w-full">
      <label
        htmlFor={props.id || props.name}
        className="block font-medium mb-2"
        style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '16px', color: '#FFFFFF', marginTop: '4px' }}
      >
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          {...props}
          className={`w-full rounded-lg transition-all duration-200 outline-none ${className}`}
          style={{
            width: '100%',
            backgroundColor: '#0f0f0f',
            border: `1px solid ${getBorderColor()}`,
            borderRadius: '8px',
            padding: '14px 16px',
            fontSize: '18px',
            fontFamily: "'Merriweather', Georgia, serif",
            color: '#f5f5f5',
            boxShadow: getBoxShadow(),
            minHeight: '48px',
            flexShrink: 0,
            boxSizing: 'border-box',
            ...(props.style || {})
          }}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          placeholder={props.placeholder}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-1.5" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-gray-500 text-sm mt-1.5" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
          {helpText}
        </p>
      )}
    </div>
  )
}
