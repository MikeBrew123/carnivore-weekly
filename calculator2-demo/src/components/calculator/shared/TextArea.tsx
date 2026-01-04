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
      <div className="flex justify-between items-baseline mb-2">
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {characterCount && maxLength && (
          <span className="text-xs text-gray-500">
            {characterLength}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        {...props}
        value={value}
        maxLength={maxLength}
        className={`
          w-full px-4 py-2.5 border rounded-lg text-base
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-colors resize-none
          ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}
          ${className}
        `}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}
