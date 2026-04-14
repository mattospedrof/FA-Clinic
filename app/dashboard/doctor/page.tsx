'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Settings } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Queries em paralelo (independentes)
    const today = new Date().toISOString().split('T')[0]
    const [apptsRes, dcRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, clinics(name, city, state), patients(full_name)')
        .eq('doctor_id', user.id)
        .gte('date', view === 'upcoming' ? today : '1900-01-01')
        .lte('date', view === 'past' ? today : '2099-12-31')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('doctor_clinics')
        .select('*, clinics(*)')
        .eq('doctor_id', user.id),
    ])

    setAppointments(apptsRes.data || [])
    setClinics(dcRes.data?.map((d: any) => d.clinics) || [])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id)
    // Re-fetch apenas appointments, não doctor_clinics
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, clinics(name, city, state), patients(full_name)')
      .eq('doctor_id', user.id)
      .gte('date', view === 'upcoming' ? today : '1900-01-01')
      .lte('date', view === 'past' ? today : '2099-12-31')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    setAppointments(appts || [])
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Minha Agenda</h1>
          <p className="text-gray-500 mt-1">Consultas e clínicas vinculadas</p>
        </div>
      </div>

      {/* Clinics */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          Clínicas Vinculadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clinics.length === 0 ? (
            <p className="text-gray-500 col-span-3 text-center py-4">Nenhuma clínica vinculada</p>
          ) : clinics.map((c: any) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800">{c.name}</p>
              <p className="text-sm text-gray-500">{c.city}/{c.state}</p>
              <p className="text-sm text-gray-500 mt-1">
                <Clock className="w-4 h-4 inline" /> {c.opening_time} - {c.closing_time}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setView('upcoming')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
          Próximas Consultas
        </button>
        <button onClick={() => setView('past')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'past' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
          Histórico
        </button>
      </div>

      {/* Appointments */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Carregando...</p>
        ) : appointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma consulta encontrada</p>
        ) : (
          <div className="divide-y">
            {appointments.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{a.patients?.full_name || 'Paciente'}</p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(a.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      {' '}• {a.start_time?.slice(0, 5)}
                    </p>
                    <p className="text-xs text-gray-400">{a.clinics?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    a.status === 'completed' ? 'bg-green-100 text-green-800' :
                    a.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    a.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {a.status}
                  </span>
                  {view === 'upcoming' && a.status === 'scheduled' && (
                    <>
                      <button onClick={() => updateStatus(a.id, 'confirmed')} className="text-green-600 hover:text-green-800" title="Confirmar">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStatus(a.id, 'cancelled')} className="text-red-600 hover:text-red-800" title="Cancelar">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
