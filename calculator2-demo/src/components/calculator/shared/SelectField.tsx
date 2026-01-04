import { SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string
  options: SelectOption[]
  error?: string
  helpText?: string
  placeholder?: string
}

export default function SelectField({
  label,
  options,
  error,
  helpText,
  placeholder,
  className = '',
  ...props
}: SelectFieldProps) {
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

      <select
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
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffd700' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem',
          cursor: 'pointer'
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
        className={className}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

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
