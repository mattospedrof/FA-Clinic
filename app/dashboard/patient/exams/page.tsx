'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Stethoscope, Calendar, Clock, FileDown } from 'lucide-react'
import { PageHeader, StatCard, Badge, StatCardSkeleton, TableSkeleton, Toast } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNetworkError } from '@/hooks/useNetworkError'

export default function PatientExamsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadExams() }, [])

  const loadExams = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { data: patients } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)

      const patientIds = patients?.map((p: any) => p.id) || []

      if (patientIds.length > 0) {
        // Queries em paralelo (sem nested await)
        const [apptsRes, apptExamsRes] = await Promise.all([
          supabase
            .from('appointments')
            .select('id')
            .in('patient_id', patientIds),
          supabase
            .from('exams')
            .select('*, clinics(name)')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        ])

        const apptIds = apptsRes.data?.map((a: any) => a.id) || []

        let appointmentExams: any[] = []
        if (apptIds.length > 0) {
          const { data, error } = await supabase
            .from('appointment_exams')
            .select('*, exams(*), appointments(date, clinics(name))')
            .in('appointment_id', apptIds)
          if (error) { handleError(error); setLoading(false); return }
          appointmentExams = data || []
        }

        setExams(appointmentExams)
      }
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Meus Exames"
        subtitle="Exames solicitados"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Exames" value={exams.length} icon={Stethoscope} color="bg-blue-500" loading={loading} />
        <StatCard label="Agendados" value={exams.filter(e => e.status === 'scheduled').length} icon={Calendar} color="bg-yellow-500" loading={loading} />
        <StatCard label="Realizados" value={exams.filter(e => e.status === 'completed').length} icon={Clock} color="bg-green-500" loading={loading} />
      </div>

      {networkError && (
        <Toast message={networkError.message} type="error" onClose={() => clearError()} />
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCardSkeleton count={3} />
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Nenhum exame solicitado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((e) => (
            <div key={e.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">
                      {e.exams?.name || 'Exame'}
                    </p>
                    {e.exams?.description && (
                      <p className="text-sm text-gray-500 mt-1">{e.exams.description}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      {e.appointments?.date
                        ? format(parseISO(e.appointments.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Data a definir'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {e.appointments?.clinics?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={e.status || 'scheduled'} />
                  {e.exams?.price && (
                    <span className="text-sm font-medium text-gray-700">
                      R$ {e.exams.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
