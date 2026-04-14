'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { FileText, Calendar, FileDown } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadPrescriptions() }, [])

  const loadPrescriptions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: patients } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)

    const patientIds = patients?.map((p: any) => p.id) || []

    if (patientIds.length > 0) {
      const { data } = await supabase
        .from('prescriptions')
        .select('*, clinics(name), doctors:profiles(full_name)')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false })

      setPrescriptions(data || [])
    }
    setLoading(false)
  }

  const exportPDF = (rx: any) => {
    const doc = new jsPDF()

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Receita Médica', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let y = 35

    doc.setFont('helvetica', 'bold')
    doc.text('Paciente:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(rx.doctors?.full_name ? `Dr(a). ${rx.doctors.full_name}` : 'N/A', 55, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Clínica:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(rx.clinics?.name || 'N/A', 55, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Data:', 20, y); doc.setFont('helvetica', 'normal'); doc.text(rx.created_at ? format(parseISO(rx.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A', 55, y); y += 15

    doc.setLineWidth(0.5)
    doc.line(20, y, 190, y); y += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Prescrição:', 20, y); y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const lines = doc.splitTextToSize(rx.content || '', 160)
    doc.text(lines, 20, y)

    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(9)
    doc.setTextColor(128)
    doc.text('Documento gerado pelo sistema FA Clinic', 105, pageHeight - 15, { align: 'center' })

    doc.save(`receita_${format(parseISO(rx.created_at), 'yyyy-MM-dd')}.pdf`)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Minhas Receitas"
        subtitle="Receitas médicas emitidas"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Receitas" value={prescriptions.length} icon={FileText} color="bg-purple-500" loading={loading} />
        <StatCard label="Este Mês" value={prescriptions.filter(p => {
          const d = new Date(p.created_at)
          const now = new Date()
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length} icon={Calendar} color="bg-blue-500" loading={loading} />
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <FileDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Exportar</p>
            <p className="text-sm font-medium text-red-700">PDF individual</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Carregando...</p>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Nenhuma receita emitida</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Dr(a). {rx.doctors?.full_name}</p>
                      <p className="text-xs text-gray-400">{rx.clinics?.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3 ml-11 whitespace-pre-wrap">{rx.content}</p>
                  <p className="text-xs text-gray-400 ml-11 mt-2">
                    Emitida em {rx.created_at ? format(parseISO(rx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                  </p>
                </div>
                <button
                  onClick={() => exportPDF(rx)}
                  className="ml-4 text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                  title="Exportar PDF"
                >
                  <FileDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
