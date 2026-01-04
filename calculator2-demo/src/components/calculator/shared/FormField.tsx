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
      <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          {...props}
          className={`
            w-full px-4 py-2.5 border rounded-lg text-base
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors
            ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}
            ${icon ? 'pl-10' : ''}
            ${className}
          `}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}
