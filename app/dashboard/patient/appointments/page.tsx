'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader, StatCard, Badge, SearchInput } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const supabase = createClient()

  useEffect(() => { loadAppointments() }, [])

  const loadAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: patients } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)

    const patientIds = patients?.map((p: any) => p.id) || []

    if (patientIds.length > 0) {
      const { data } = await supabase
        .from('appointments')
        .select('*, clinics(name, city, state), doctors:profiles(full_name)')
        .in('patient_id', patientIds)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      setAppointments(data || [])
    }
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = appointments.filter(a => a.date >= today && !['cancelled', 'completed'].includes(a.status))
  const past = appointments.filter(a => a.date < today || ['cancelled', 'completed'].includes(a.status))

  const filteredAppointments = filter === 'all'
    ? appointments
    : filter === 'upcoming'
    ? upcoming
    : past

  const searched = filteredAppointments.filter((a) =>
    a.doctors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.clinics?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.date?.includes(searchTerm)
  )

  return (
    <DashboardLayout>
      <PageHeader
        title="Minhas Consultas"
        subtitle="Histórico completo de consultas"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Consultas" value={appointments.length} icon={Calendar} color="bg-blue-500" loading={loading} />
        <StatCard label="Próximas" value={upcoming.length} icon={Clock} color="bg-green-500" loading={loading} />
        <StatCard label="Realizadas" value={past.length} icon={CheckCircle} color="bg-purple-500" loading={loading} />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        {(['all', 'upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'upcoming' ? 'Próximas' : 'Passadas'}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por médico, clínica ou data..." />
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Carregando...</p>
      ) : searched.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Nenhuma consulta encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {searched.map((a) => {
            const isToday = a.date === today
            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl shadow p-5 ${isToday ? 'border-l-4 border-green-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${
                      a.status === 'completed' ? 'bg-green-500' :
                      a.status === 'cancelled' ? 'bg-red-500' :
                      a.status === 'confirmed' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">
                        Dr(a). {a.doctors?.full_name || 'Médico'}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {a.clinics?.name} — {a.clinics?.city}/{a.clinics?.state}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(parseISO(a.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {' '}às {a.start_time?.slice(0, 5)}
                      </p>
                      {isToday && (
                        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Hoje
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge status={a.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
