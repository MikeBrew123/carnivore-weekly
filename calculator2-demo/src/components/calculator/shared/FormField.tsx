import { InputHTMLAttributes, ReactNode } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helpText?: string
  icon?: ReactNode
}

export default function FormField({
  label,
  error,
  helpText,
  icon,
  className = '',
  ...props
}: FormFieldProps) {
  return (
    <div className="w-full">
      <label
        htmlFor={props.id || props.name}
        style={{
          display: 'block',
          color: '#a0a0a0',
          fontFamily: "'Merriweather', Georgia, serif",
          fontSize: '16px',
          fontWeight: '500',
          marginBottom: '8px'
        }}
      >
        {label}
        {props.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>

      <div className="relative">
        <input
          {...props}
          style={{
            width: '100%',
            backgroundColor: '#0f0f0f',
            border: error ? '1px solid #ef4444' : '1px solid #333',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '18px',
            fontFamily: "'Merriweather', Georgia, serif",
            color: '#f5f5f5',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            outline: 'none',
            ...(props.style || {})
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#ffd700';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 215, 0, 0.2)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#ef4444' : '#333';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          placeholder={props.placeholder}
          className={className}
        />
        {icon && (
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>
            {icon}
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px', marginTop: '6px' }}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p style={{ color: '#666', fontFamily: "'Merriweather', Georgia, serif", fontSize: '14px', marginTop: '6px' }}>
          {helpText}
        </p>
      )}
    </div>
  )
}
