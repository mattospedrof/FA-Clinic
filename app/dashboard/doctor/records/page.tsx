'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { FileText, Plus, Edit, FileDown, Table as TableIcon, CheckCircle } from 'lucide-react'
import { PageHeader, StatCard, Modal, Toast, Badge, DataTable, StatCardSkeleton, TableSkeleton } from '@/components/ui'
import { createMedicalRecord, updateMedicalRecord } from '@/app/actions'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { useNetworkError } from '@/hooks/useNetworkError'

export default function DoctorRecordsPage() {
  const [records, setRecords] = useState<any[]>([])
  const [appointmentsWithoutRecords, setAppointmentsWithoutRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [recordData, setRecordData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Queries em paralelo
      const [recordsRes, completedApptsRes] = await Promise.all([
        supabase
          .from('medical_records')
          .select('*, patients(full_name), clinics(name), appointments(date, start_time)')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('*, patients(full_name), clinics(name)')
          .eq('doctor_id', user.id)
          .eq('status', 'completed')
          .order('date', { ascending: false }),
      ])

      if (recordsRes.error) { handleError(recordsRes.error); setLoading(false); return }

      // Filtrar consultas que já têm prontuário
      const recordApptIds = new Set(recordsRes.data?.map((r: any) => r.appointment_id) || [])
      const withoutRecords = completedApptsRes.data?.filter((a: any) => !recordApptIds.has(a.id)) || []

      setRecords(recordsRes.data || [])
      setAppointmentsWithoutRecords(withoutRecords)
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = (appointment: any) => {
    setSelectedAppointment(appointment)
    setRecordData({
      diagnosis: '',
      evolution: '',
      notes: '',
      prescription: '',
    })
    setFormError('')
    setShowCreateModal(true)
  }

  const handleView = (record: any) => {
    setSelectedRecord(record)
    setShowViewModal(true)
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const result = await createMedicalRecord({
      appointment_id: selectedAppointment.id,
      clinic_id: selectedAppointment.clinic_id,
      patient_id: selectedAppointment.patient_id,
      ...recordData,
    })

    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao criar prontuário')
      return
    }

    setToast({ message: 'Prontuário criado com sucesso', type: 'success' })
    setShowCreateModal(false)
    setSelectedAppointment(null)
    loadData()
  }

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setRecordData({
      diagnosis: record.diagnosis || '',
      evolution: record.evolution || '',
      notes: record.notes || '',
      prescription: '',
    })
    setFormError('')
    setShowCreateModal(true)
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedRecord) return

    setFormError('')
    setSubmitting(true)

    const result = await updateMedicalRecord(selectedRecord.id, recordData)
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao atualizar prontuário')
      return
    }

    setToast({ message: 'Prontuário atualizado com sucesso', type: 'success' })
    setShowCreateModal(false)
    setSelectedRecord(null)
    loadData()
  }

  const exportPDF = (record: any) => {
    const doc = new jsPDF()
    doc.setFont('helvetica')
    doc.setFontSize(16)
    doc.text('Prontuário Médico', 20, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let y = 35

    doc.setFont('helvetica', 'bold')
    doc.text('Paciente:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(record.patients?.full_name || 'N/A', 60, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Clínica:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(record.clinics?.name || 'N/A', 60, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Data:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(record.appointments?.date || 'N/A', 60, y); y += 12

    if (record.diagnosis) {
      doc.setFont('helvetica', 'bold'); doc.text('Diagnóstico:', 20, y); y += 6
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(record.diagnosis, 170)
      doc.text(lines, 20, y); y += lines.length * 5 + 4
    }

    if (record.evolution) {
      doc.setFont('helvetica', 'bold'); doc.text('Evolução:', 20, y); y += 6
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(record.evolution, 170)
      doc.text(lines, 20, y); y += lines.length * 5 + 4
    }

    if (record.notes) {
      doc.setFont('helvetica', 'bold'); doc.text('Notas:', 20, y); y += 6
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(record.notes, 170)
      doc.text(lines, 20, y); y += lines.length * 5 + 4
    }

    doc.save(`prontuario_${record.patients?.full_name || 'paciente'}.pdf`)
  }

  const exportAllXLSX = () => {
    const data = records.map((r) => ({
      Paciente: r.patients?.full_name || '',
      Clínica: r.clinics?.name || '',
      Data: r.appointments?.date || '',
      Diagnóstico: r.diagnosis || '',
      Evolução: r.evolution || '',
      Notas: r.notes || '',
      Criado_em: r.created_at ? format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Prontuários')

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 12 },
      { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 20 },
    ]

    XLSX.writeFile(wb, 'prontuarios.xlsx')
  }

  const allItems = [
    ...appointmentsWithoutRecords.map((a) => ({ ...a, _type: 'pending' as const })),
    ...records.map((r) => ({ ...r, _type: 'completed' as const })),
  ].sort((a, b) => {
    const dateA = a.appointments?.date || a.date || ''
    const dateB = b.appointments?.date || b.date || ''
    return dateB.localeCompare(dateA)
  })

  const filteredItems = filter === 'all'
    ? allItems
    : filter === 'pending'
    ? allItems.filter(i => i._type === 'pending')
    : allItems.filter(i => i._type === 'completed')

  const columns = [
    {
      key: 'patient',
      label: 'Paciente',
      render: (row: any) => <span className="font-medium text-gray-800">{row.patients?.full_name || 'N/A'}</span>,
    },
    {
      key: 'clinic',
      label: 'Clínica',
      render: (row: any) => row.clinics?.name || 'N/A',
    },
    {
      key: 'date',
      label: 'Data',
      render: (row: any) => {
        const date = row.appointments?.date || row.date
        return date ? format(parseISO(date), "dd/MM/yyyy", { locale: ptBR }) : '—'
      },
    },
    {
      key: 'diagnosis',
      label: 'Diagnóstico',
      render: (row: any) => row._type === 'completed'
        ? <span className="text-sm text-gray-600 truncate max-w-xs block">{row.diagnosis || '—'}</span>
        : <span className="text-gray-400 italic">Pendente</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => row._type === 'pending'
        ? <Badge status="scheduled" />
        : <Badge status="completed" />,
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (row: any) => row._type === 'pending' ? (
        <button
          onClick={(e) => { e.stopPropagation(); handleCreate(row) }}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Criar Prontuário
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleView(row) }}
            className="text-gray-600 hover:text-gray-800"
            title="Visualizar"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row) }}
            className="text-blue-600 hover:text-blue-800"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); exportPDF(row) }}
            className="text-red-600 hover:text-red-800"
            title="Exportar PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Prontuários"
        subtitle="Prontuários médicos e receitas"
        action={
          appointmentsWithoutRecords.length > 0 && (
            <button
              onClick={() => handleCreate(appointmentsWithoutRecords[0])}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {appointmentsWithoutRecords.length} Prontuário(s) Pendente(s)
            </button>
          )
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCardSkeleton count={4} />
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Prontuários Criados" value={records.length} icon={FileText} color="bg-blue-500" loading={loading} />
            <StatCard label="Pendentes" value={appointmentsWithoutRecords.length} icon={CheckCircle} color="bg-yellow-500" loading={loading} />
            <StatCard label="Com Receita" value={records.length} icon={FileText} color="bg-purple-500" loading={loading} />
            <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <TableIcon className="w-5 h-5 text-white" />
              </div>
              <button
                onClick={exportAllXLSX}
                disabled={records.length === 0}
                className="text-sm font-medium text-green-700 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 mb-4">
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
              </button>
            ))}
          </div>

          <DataTable columns={columns} data={filteredItems} loading={loading} emptyMessage="Nenhum prontuário encontrado" />
        </>
      )}

      {/* Modal Criar/Editar Prontuário */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={selectedRecord ? 'Editar Prontuário' : 'Criar Prontuário'}
      >
        <form onSubmit={selectedRecord ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
          {formError && (
            <Toast message={formError} type="error" onClose={() => setFormError('')} />
          )}

          {/* Pré-preenchido */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Dados da Consulta</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-blue-700">
              <p><span className="font-medium">Paciente:</span> {selectedAppointment?.patients?.full_name || selectedRecord?.patients?.full_name}</p>
              <p><span className="font-medium">Clínica:</span> {selectedAppointment?.clinics?.name || selectedRecord?.clinics?.name}</p>
              <p><span className="font-medium">Data:</span> {selectedAppointment?.date || selectedRecord?.appointments?.date}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Diagnóstico *</label>
            <textarea
              value={recordData.diagnosis || ''}
              onChange={(e) => setRecordData({ ...recordData, diagnosis: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Descreva o diagnóstico..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Evolução</label>
            <textarea
              value={recordData.evolution || ''}
              onChange={(e) => setRecordData({ ...recordData, evolution: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Evolução do paciente..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notas / Observações</label>
            <textarea
              value={recordData.notes || ''}
              onChange={(e) => setRecordData({ ...recordData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Notas adicionais..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Receita Médica (opcional)</label>
            <textarea
              value={recordData.prescription || ''}
              onChange={(e) => setRecordData({ ...recordData, prescription: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Medicamentos, dosagens e instruções..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Salvando...' : selectedRecord ? 'Atualizar' : 'Criar Prontuário'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Visualizar Prontuário */}
      <Modal
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Prontuário Médico"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                <p><span className="font-medium">Paciente:</span> {selectedRecord.patients?.full_name}</p>
                <p><span className="font-medium">Clínica:</span> {selectedRecord.clinics?.name}</p>
                <p><span className="font-medium">Data:</span> {selectedRecord.appointments?.date}</p>
                <p><span className="font-medium">Criado em:</span> {selectedRecord.created_at ? format(parseISO(selectedRecord.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ''}</p>
              </div>
            </div>

            {selectedRecord.diagnosis && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Diagnóstico</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">{selectedRecord.diagnosis}</p>
              </div>
            )}

            {selectedRecord.evolution && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Evolução</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">{selectedRecord.evolution}</p>
              </div>
            )}

            {selectedRecord.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Notas</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">{selectedRecord.notes}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { exportPDF(selectedRecord); setShowViewModal(false) }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </button>
              <button
                onClick={() => { setShowViewModal(false); handleEdit(selectedRecord) }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
