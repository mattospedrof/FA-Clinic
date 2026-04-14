'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Plus, CheckCircle, XCircle, Filter, FileDown } from 'lucide-react'
import { PageHeader, StatCard, DataTable, Badge, Modal, Toast, SearchInput } from '@/components/ui'
import { createAppointment, updateAppointmentStatus } from '@/app/actions'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
}

export default function StaffAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ status: '', type: '', doctor_id: '', date_start: '', date_end: '' })
  const [showExport, setShowExport] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(['patient', 'date', 'start_time', 'doctor', 'clinic', 'status'])
  const [showModal, setShowModal] = useState(false)
  const [appointmentData, setAppointmentData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [apptsRes, patientsRes, clinicsRes, doctorsRes] = await Promise.all([
      supabase.from('appointments').select('*, patients(full_name, cpf), clinics(name), doctors:profiles(full_name)').order('date', { ascending: true }),
      supabase.from('patients').select('id, full_name, cpf').order('full_name'),
      supabase.from('clinics').select('id, name').eq('is_active', true).order('name'),
      supabase.from('doctor_clinics').select('*, profiles(full_name)').order('profiles(full_name)'),
    ])

    setAppointments(apptsRes.data || [])
    setPatients(patientsRes.data || [])
    setClinics(clinicsRes.data || [])
    setDoctors(doctorsRes.data?.map((d: any) => ({ id: d.profiles?.id, name: d.profiles?.full_name, clinic_id: d.clinic_id })) || [])
    setLoading(false)
  }

  const handleNew = () => {
    setAppointmentData({ type: 'consultation' })
    setFormError('')
    setShowModal(true)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateAppointmentStatus(id, status)
    if (result.success) {
      setToast({ message: `Status atualizado para ${STATUS_LABELS[status]}`, type: 'success' })
      loadData()
    } else {
      setToast({ message: result.error || 'Erro ao atualizar status', type: 'error' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const result = await createAppointment(appointmentData)
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao criar agendamento')
      return
    }

    setToast({ message: 'Agendamento criado com sucesso', type: 'success' })
    setShowModal(false)
    setAppointmentData({})
    loadData()
  }

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(a => a.date === today)
  const upcomingAppointments = appointments.filter(a => a.date >= today && !['cancelled', 'completed'].includes(a.status))

  const filteredAppointments = appointments.filter((a) => {
    const matchSearch = a.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.clinics?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.doctors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.date?.includes(searchTerm)
    const matchStatus = !filters.status || a.status === filters.status
    const matchType = !filters.type || a.type === filters.type
    const matchDoctor = !filters.doctor_id || a.doctor_id === filters.doctor_id
    const matchDateStart = !filters.date_start || a.date >= filters.date_start
    const matchDateEnd = !filters.date_end || a.date <= filters.date_end
    return matchSearch && matchStatus && matchType && matchDoctor && matchDateStart && matchDateEnd
  })

  const exportXLSX = () => {
    const colMap: Record<string, { label: string; fn: (a: any) => string }> = {
      patient: { label: 'Paciente', fn: (a) => a.patients?.full_name || '' },
      date: { label: 'Data', fn: (a) => a.date || '' },
      start_time: { label: 'Horário', fn: (a) => a.start_time?.slice(0, 5) || '' },
      end_time: { label: 'Término', fn: (a) => a.end_time?.slice(0, 5) || '' },
      doctor: { label: 'Médico', fn: (a) => a.doctors?.full_name || '' },
      clinic: { label: 'Clínica', fn: (a) => a.clinics?.name || '' },
      status: { label: 'Status', fn: (a) => STATUS_LABELS[a.status] || a.status },
      type: { label: 'Tipo', fn: (a) => a.type === 'consultation' ? 'Consulta' : 'Exame' },
      notes: { label: 'Notas', fn: (a) => a.notes || '' },
    }
    const cols = selectedCols.map((k) => colMap[k]).filter(Boolean)
    const data = filteredAppointments.map((a) => {
      const row: Record<string, string> = {}
      cols.forEach((c) => { row[c.label] = c.fn(a) })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos')
    ws['!cols'] = cols.map(() => ({ wch: 20 }))
    XLSX.writeFile(wb, `agendamentos_${new Date().toISOString().split('T')[0]}.xlsx`)
    setShowExport(false)
    setToast({ message: 'Exportação concluída', type: 'success' })
  }

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
      key: 'clinic',
      label: 'Clínica',
      render: (row: any) => row.clinics?.name || 'N/A',
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

  // Filtrar médicos pela clínica selecionada
  const availableDoctors = appointmentData.clinic_id
    ? doctors.filter((d) => d.clinic_id === appointmentData.clinic_id)
    : doctors

  return (
    <DashboardLayout>
      <PageHeader
        title="Agendamentos"
        subtitle="Gerencie todos os agendamentos"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Agendamentos Hoje" value={todayAppointments.length} icon={Calendar} color="bg-blue-500" loading={loading} />
        <StatCard label="Próximos Agendamentos" value={upcomingAppointments.length} icon={Calendar} color="bg-green-500" loading={loading} />
        <StatCard label="Total Geral" value={appointments.length} icon={Calendar} color="bg-purple-500" loading={loading} />
      </div>

      <div className="mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por paciente, médico, clínica ou data..." />
      </div>

      {/* Filtros avançados */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os tipos</option>
            <option value="consultation">Consulta</option>
            <option value="exam">Exame</option>
          </select>
          <select value={filters.doctor_id} onChange={(e) => setFilters({ ...filters, doctor_id: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os médicos</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="date" value={filters.date_start} onChange={(e) => setFilters({ ...filters, date_start: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={filters.date_end} onChange={(e) => setFilters({ ...filters, date_end: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(filters.status || filters.type || filters.doctor_id || filters.date_start || filters.date_end) && (
          <button onClick={() => setFilters({ status: '', type: '', doctor_id: '', date_start: '', date_end: '' })} className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline">Limpar filtros</button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{filteredAppointments.length} de {appointments.length} agendamentos</p>
        <button onClick={() => setShowExport(true)} className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm font-medium">
          <FileDown className="w-4 h-4" /> Exportar XLSX
        </button>
      </div>

      <DataTable columns={columns} data={filteredAppointments} loading={loading} emptyMessage="Nenhum agendamento encontrado" highlightOnHover />

      {/* Modal Export */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Exportar Agendamentos">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecione as colunas para exportar:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'patient', label: 'Paciente' },
              { key: 'date', label: 'Data' },
              { key: 'start_time', label: 'Horário' },
              { key: 'end_time', label: 'Término' },
              { key: 'doctor', label: 'Médico' },
              { key: 'clinic', label: 'Clínica' },
              { key: 'status', label: 'Status' },
              { key: 'type', label: 'Tipo' },
              { key: 'notes', label: 'Notas' },
            ].map((col) => (
              <label key={col.key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedCols.includes(col.key)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedCols([...selectedCols, col.key])
                    else setSelectedCols(selectedCols.filter((c) => c !== col.key))
                  }}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={exportXLSX} disabled={selectedCols.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Exportar
            </button>
            <button onClick={() => setShowExport(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
          </div>
        </div>
      </Modal>

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
              <label className="text-sm font-medium text-gray-700">Clínica *</label>
              <select
                value={appointmentData.clinic_id || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, clinic_id: e.target.value, doctor_id: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecionar clínica</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Médico *</label>
              <select
                value={appointmentData.doctor_id || ''}
                onChange={(e) => setAppointmentData({ ...appointmentData, doctor_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!appointmentData.clinic_id}
              >
                <option value="">Selecionar médico</option>
                {availableDoctors.map((d) => (
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
