interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'info'
  onClose?: () => void
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={`mb-4 p-3 border rounded-lg flex items-center justify-between ${styles[type]}`}>
      <span className="text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 text-lg leading-none">
          ×
        </button>
      )}
    </div>
  )
}
