'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Plus, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader, StatCard, DataTable, Badge, Modal, Toast, SearchInput, StatCardSkeleton, TableSkeleton } from '@/components/ui'
import { createAppointment, updateAppointmentStatus } from '@/app/actions'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNetworkError } from '@/hooks/useNetworkError'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
}

export default function ClinicAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [appointmentData, setAppointmentData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadClinic(); }, [])

  const loadClinic = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obter clínica do staff logado
    const { data: staffClinics } = await supabase
      .from('clinic_staff')
      .select('clinic_id')
      .eq('user_id', user.id)

    const cId = staffClinics?.[0]?.clinic_id || null
    setClinicId(cId)

    if (cId) {
      await loadData(cId)
    } else {
      setLoading(false)
    }
  }

  const loadData = async (cId: string) => {
    try {
      const [apptsRes, patientsRes, doctorsRes] = await Promise.all([
        supabase.from('appointments').select('*, patients(full_name, cpf), clinics(name), doctors:profiles(full_name)').eq('clinic_id', cId).order('date', { ascending: true }),
        supabase.from('clinic_patients').select('*, patients(id, full_name, cpf)').eq('clinic_id', cId),
        supabase.from('doctor_clinics').select('*, profiles(full_name)').eq('clinic_id', cId),
      ])

      if (apptsRes.error) { handleError(apptsRes.error); setLoading(false); return }

      setAppointments(apptsRes.data || [])
      setPatients(patientsRes.data?.map((p: any) => p.patients).filter(Boolean) || [])
      setDoctors(doctorsRes.data?.map((d: any) => ({ id: d.profiles?.id, name: d.profiles?.full_name })) || [])
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setAppointmentData({ type: 'consultation', clinic_id: clinicId })
    setFormError('')
    setShowModal(true)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateAppointmentStatus(id, status)
    if (result.success) {
      setToast({ message: `Status atualizado para ${STATUS_LABELS[status]}`, type: 'success' })
      if (clinicId) loadData(clinicId)
    } else {
      setToast({ message: result.error || 'Erro ao atualizar status', type: 'error' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const result = await createAppointment({ ...appointmentData, clinic_id: clinicId! })
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao criar agendamento')
      return
    }

    // Vincular paciente à clínica se não estiver
    if (clinicId && appointmentData.patient_id) {
      await supabase.from('clinic_patients').insert({
        clinic_id: clinicId,
        patient_id: appointmentData.patient_id,
      }).select().maybeSingle()
    }

    setToast({ message: 'Agendamento criado com sucesso', type: 'success' })
    setShowModal(false)
    setAppointmentData({})
    if (clinicId) loadData(clinicId)
  }

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(a => a.date === today)
  const upcomingAppointments = appointments.filter(a => a.date >= today && !['cancelled', 'completed'].includes(a.status))

  const filteredAppointments = appointments.filter((a) =>
    a.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.doctors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.date?.includes(searchTerm)
  )

  const columns = [
    {
      key: 'patient',
      label: 'Paciente',
      render: (row: any) => <span className="font-medium text-gray-800">{row.patients?.full_name || 'N/A'}</span>,
    },
    {
      key: 'date',
      label: 'Data',
      render: (row: any) => row.date ? format(parseISO(row.date), "dd/MM/yyyy", { locale: ptBR }) : '—',
    },
    {
      key: 'start_time',
      label: 'Horário',
      render: (row: any) => row.start_time?.slice(0, 5) || '—',
    },
    {
      key: 'doctor',
      label: 'Médico',
      render: (row: any) => row.doctors?.full_name || 'N/A',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (row: any) => (
        <div className="flex gap-2">
          {row.status === 'scheduled' && (
            <>
              <button
                onClick={() => handleStatusChange(row.id, 'confirmed')}
                className="text-green-600 hover:text-green-800"
                title="Confirmar"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStatusChange(row.id, 'cancelled')}
                className="text-red-600 hover:text-red-800"
                title="Cancelar"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {row.status === 'confirmed' && (
            <button
              onClick={() => handleStatusChange(row.id, 'completed')}
              className="text-blue-600 hover:text-blue-800"
              title="Concluir"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  if (!clinicId) {
    return (
      <DashboardLayout>
        <PageHeader title="Agendamentos" subtitle="Agendamentos da clínica" />
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Você não está vinculado a nenhuma clínica.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Agendamentos"
        subtitle="Agendamentos da clínica"
        action={
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        }
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

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
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Agendamentos Hoje" value={todayAppointments.length} icon={Calendar} color="bg-blue-500" loading={loading} />
            <StatCard label="Próximos" value={upcomingAppointments.length} icon={Calendar} color="bg-green-500" loading={loading} />
            <StatCard label="Total Geral" value={appointments.length} icon={Calendar} color="bg-purple-500" loading={loading} />
          </div>

          <div className="mb-4">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por paciente, médico ou data..." />
          </div>

          <DataTable columns={columns} data={filteredAppointments} loading={loading} emptyMessage="Nenhum agendamento nesta clínica" />
        </>
      )}

      {/* Modal de Criar Agendamento */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Agendamento"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Toast message={formError} type="error" onClose={() => setFormError('')} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Médico *</label>
              <select
                value={appointmentData.doctor_id || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, doctor_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecionar médico</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Paciente *</label>
              <select
                value={appointmentData.patient_id || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, patient_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecionar paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tipo *</label>
              <select
                value={appointmentData.type || 'consultation'}
                onChange={(e) => setAppointmentData({ ...appointmentData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="consultation">Consulta</option>
                <option value="exam">Exame</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Data *</label>
              <input
                type="date"
                value={appointmentData.date || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Horário Início *</label>
              <input
                type="time"
                value={appointmentData.start_time || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={appointmentData.notes || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Criando...' : 'Criar Agendamento'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
