import { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helpText?: string
  characterCount?: boolean
}

export default function TextArea({
  label,
  error,
  helpText,
  characterCount,
  className = '',
  maxLength,
  value,
  ...props
}: TextAreaProps) {
  const characterLength = typeof value === 'string' ? value.length : 0

  return (
    <div className="w-full">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <label
          htmlFor={props.id || props.name}
          style={{
            display: 'block',
            color: '#a0a0a0',
            fontFamily: "'Merriweather', Georgia, serif",
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          {label}
          {props.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
        {characterCount && maxLength && (
          <span style={{ fontSize: '12px', color: '#666', fontFamily: "'Merriweather', Georgia, serif" }}>
            {characterLength}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        {...props}
        value={value}
        maxLength={maxLength}
        style={{
          width: '100%',
          backgroundColor: '#0f0f0f',
          border: error ? '1px solid #ef4444' : '1px solid #333',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          fontFamily: "'Merriweather', Georgia, serif",
          color: '#f5f5f5',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          outline: 'none',
          resize: 'none',
          minHeight: '120px'
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
      />

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
