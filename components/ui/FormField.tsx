interface FormFieldProps {
  label?: string
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, error, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
