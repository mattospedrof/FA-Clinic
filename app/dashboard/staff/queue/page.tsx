'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { ListOrdered, Clock, Users, Calendar, ArrowUp, ArrowDown } from 'lucide-react'
import { PageHeader, StatCard, Badge, StatCardSkeleton, TableSkeleton, Toast } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNetworkError } from '@/hooks/useNetworkError'

export default function StaffQueuePage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadQueue() }, [])

  const loadQueue = async () => {
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(full_name), clinics(name), doctors:profiles(full_name)')
        .gte('date', today)
        .not('status', 'in', '(cancelled,completed)')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) { handleError(error); return }
      setAppointments(data || [])
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: 'date' | 'status') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const sortedAppointments = [...appointments].sort((a, b) => {
    const aVal = sortBy === 'date' ? a.date + a.start_time : a.status
    const bVal = sortBy === 'date' ? b.date + b.start_time : b.status
    const cmp = aVal.localeCompare(bVal)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const today = new Date().toISOString().split('T')[0]
  const todayAppts = appointments.filter(a => a.date === today)
  const upcomingAppts = appointments.filter(a => a.date > today)

  // Calcular tempo médio de espera (simulado)
  const avgWait = '15 min'

  return (
    <DashboardLayout>
      <PageHeader
        title="Fila de Espera"
        subtitle="Agendamentos pendentes ordenados por data"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Na Fila" value={appointments.length} icon={ListOrdered} color="bg-blue-500" loading={loading} />
        <StatCard label="Hoje" value={todayAppts.length} icon={Clock} color="bg-yellow-500" loading={loading} />
        <StatCard label="Próximos Dias" value={upcomingAppts.length} icon={Calendar} color="bg-green-500" loading={loading} />
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Espera Média</p>
            <p className="text-2xl font-bold text-gray-800">{loading ? '...' : avgWait}</p>
          </div>
        </div>
      </div>

      {networkError && (
        <Toast message={networkError.message} type="error" onClose={() => clearError()} />
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCardSkeleton count={4} />
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Nenhum paciente na fila de espera</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((a, idx) => {
            const isToday = a.date === today
            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl shadow p-4 flex items-center justify-between ${
                  isToday ? 'border-l-4 border-yellow-500' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                    isToday ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{a.patients?.full_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">
                      Dr(a). {a.doctors?.full_name || 'N/A'} • {a.clinics?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(a.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      {' '}às {a.start_time?.slice(0, 5)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isToday && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Hoje
                    </span>
                  )}
                  <Badge status={a.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ordenação */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => handleSort('date')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            sortBy === 'date' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
          }`}
        >
          {sortBy === 'date' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : null}
          Data
        </button>
        <button
          onClick={() => handleSort('status')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            sortBy === 'status' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
          }`}
        >
          {sortBy === 'status' ? (sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : null}
          Status
        </button>
      </div>
    </DashboardLayout>
  )
}
