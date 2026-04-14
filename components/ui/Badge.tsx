interface BadgeProps {
  status: string
  variant?: 'default' | 'appointment'
}

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Agendado' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmado' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Concluído' },
  no_show: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Não compareceu' },
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativo' },
  inactive: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inativo' },
  true: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativa' },
  false: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inativa' },
}

export function Badge({ status, variant = 'default' }: BadgeProps) {
  const config = STATUS_MAP[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}
