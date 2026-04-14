'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Stethoscope, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: patients } = await supabase.from('patients').select('id').eq('user_id', user.id)
    const patientIds = patients?.map((p: any) => p.id) || []

    if (patientIds.length > 0) {
      // Queries em paralelo
      const [apptsRes, prescrRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, clinics(name), doctors:profiles(full_name)')
          .in('patient_id', patientIds)
          .order('date', { ascending: true }),
        supabase
          .from('prescriptions')
          .select('*, clinics(name), doctors:profiles(full_name)')
          .in('patient_id', patientIds)
          .order('created_at', { ascending: false }),
      ])

      setAppointments(apptsRes.data || [])
      setPrescriptions(prescrRes.data || [])
    }
    setLoading(false)
  }

  const upcoming = appointments.filter(a => !['cancelled', 'completed'].includes(a.status))
  const past = appointments.filter(a => ['cancelled', 'completed'].includes(a.status))

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Meu Painel</h1>
        <p className="text-gray-500 mt-1">Consultas, exames e receitas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <Calendar className="w-10 h-10 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Consultas Futuras</p>
            <p className="text-2xl font-bold text-gray-800">{upcoming.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <Stethoscope className="w-10 h-10 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Exames</p>
            <p className="text-2xl font-bold text-gray-800">0</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <FileText className="w-10 h-10 text-purple-500" />
          <div>
            <p className="text-sm text-gray-500">Receitas</p>
            <p className="text-2xl font-bold text-gray-800">{prescriptions.length}</p>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Próximas Consultas
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhuma consulta agendada</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{a.doctors?.full_name || 'Médico'}</p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(a.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    {' '}às {a.start_time?.slice(0, 5)}
                  </p>
                  <p className="text-xs text-gray-400">{a.clinics?.name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  a.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {a.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescriptions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          Minhas Receitas
        </h2>
        {prescriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhuma receita encontrada</p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((p) => (
              <div key={p.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">Dr(a). {p.doctors?.full_name}</p>
                  <p className="text-xs text-gray-400">{p.clinics?.name}</p>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
