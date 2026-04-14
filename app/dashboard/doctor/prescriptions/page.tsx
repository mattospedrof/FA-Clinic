'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { FileText, FileDown, Table as TableIcon, Plus } from 'lucide-react'
import { PageHeader, StatCard, Modal, Toast } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRx, setSelectedRx] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadPrescriptions() }, [])

  const loadPrescriptions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, patients(full_name), clinics(name)')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setPrescriptions(data || [])
    setLoading(false)
  }

  const exportPDF = (rx: any) => {
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Receita Médica', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let y = 35

    // Dados
    doc.setFont('helvetica', 'bold')
    doc.text('Paciente:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(rx.patients?.full_name || 'N/A', 55, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Clínica:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(rx.clinics?.name || 'N/A', 55, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Data:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(rx.created_at ? format(parseISO(rx.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A', 55, y); y += 15

    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(20, y, 190, y); y += 10

    // Conteúdo da receita
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Prescrição:', 20, y); y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const lines = doc.splitTextToSize(rx.content || '', 160)
    doc.text(lines, 20, y)

    // Rodapé
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(9)
    doc.setTextColor(128)
    doc.text('Documento gerado pelo sistema FA Clinic', 105, pageHeight - 15, { align: 'center' })

    doc.save(`receita_${rx.patients?.full_name || 'paciente'}.pdf`)
  }

  const exportAllXLSX = () => {
    const data = prescriptions.map((r) => ({
      Paciente: r.patients?.full_name || '',
      Clínica: r.clinics?.name || '',
      Receita: r.content || '',
      Data: r.created_at ? format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Receitas')

    ws['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 60 }, { wch: 20 },
    ]

    XLSX.writeFile(wb, 'receitas.xlsx')
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Receitas Médicas"
        subtitle="Receitas emitidas"
        action={
          prescriptions.length > 0 && (
            <button
              onClick={exportAllXLSX}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <TableIcon className="w-4 h-4" />
              Exportar Excel
            </button>
          )
        }
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Receitas" value={prescriptions.length} icon={FileText} color="bg-purple-500" loading={loading} />
        <StatCard label="Este Mês" value={prescriptions.filter(p => {
          const d = new Date(p.created_at)
          const now = new Date()
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length} icon={FileText} color="bg-blue-500" loading={loading} />
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <FileDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Exportar</p>
            <button
              onClick={exportAllXLSX}
              disabled={prescriptions.length === 0}
              className="text-sm font-medium text-red-700 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              PDF individual
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Carregando...</p>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Nenhuma receita emitida. Crie prontuários com receitas na página de Prontuários.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{rx.patients?.full_name}</p>
                      <p className="text-xs text-gray-400">{rx.clinics?.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 ml-11">{rx.content}</p>
                  <p className="text-xs text-gray-400 ml-11 mt-1">
                    {rx.created_at ? format(parseISO(rx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => { setSelectedRx(rx); setShowViewModal(true) }}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                    title="Visualizar"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportPDF(rx)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                    title="Exportar PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Visualizar Receita */}
      <Modal
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Receita Médica"
      >
        {selectedRx && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm text-purple-800">
                <p><span className="font-medium">Paciente:</span> {selectedRx.patients?.full_name}</p>
                <p><span className="font-medium">Clínica:</span> {selectedRx.clinics?.name}</p>
                <p><span className="font-medium">Emitida em:</span> {selectedRx.created_at ? format(parseISO(selectedRx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ''}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Conteúdo da Receita</h4>
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedRx.content}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { exportPDF(selectedRx); setShowViewModal(false) }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
