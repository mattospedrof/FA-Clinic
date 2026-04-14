'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { FileText, Calendar, Users, DollarSign, Download } from 'lucide-react'
import { PageHeader, StatCard, StatCardSkeleton, TableSkeleton, Toast } from '@/components/ui'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import * as XLSX from 'xlsx'
import { useNetworkError } from '@/hooks/useNetworkError'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_COLORS: Record<string, string> = {
  scheduled: '#f59e0b',
  confirmed: '#3b82f6',
  cancelled: '#ef4444',
  completed: '#10b981',
  no_show: '#6b7280',
}

export default function ClinicReportsPage() {
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [doctorData, setDoctorData] = useState<any[]>([])
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadClinic(); }, [])

  const loadClinic = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
    const now = new Date()
    let startDate: Date
    if (period === 'month') startDate = startOfMonth(now)
    else if (period === 'quarter') startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    else startDate = new Date(now.getFullYear(), 0, 1)

    try {
      const [apptsRes, patsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, patients(full_name), doctors:profiles(full_name)')
          .eq('clinic_id', cId)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true }),
        supabase
          .from('clinic_patients')
          .select('*, patients(full_name, date_of_birth, gender, insurance_type)')
          .eq('clinic_id', cId),
      ])

      if (apptsRes.error) { handleError(apptsRes.error); setLoading(false); return }

      setAppointments(apptsRes.data || [])
      setPatients(patsRes.data?.map((p: any) => p.patients).filter(Boolean) || [])

      const statusCount: Record<string, number> = {}
      apptsRes.data?.forEach((a: any) => {
        statusCount[a.status] = (statusCount[a.status] || 0) + 1
      })
      setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })))

      const monthMap: Record<string, any> = {}
      apptsRes.data?.forEach((a: any) => {
        const month = format(parseISO(a.date), 'MMM/yyyy', { locale: ptBR })
        if (!monthMap[month]) monthMap[month] = { month, consultas: 0, concluidas: 0, receita: 0 }
        monthMap[month].consultas++
        if (a.status === 'completed') {
          monthMap[month].concluidas++
          monthMap[month].receita += 40
        }
      })
      setMonthlyData(Object.values(monthMap))

      const docMap: Record<string, number> = {}
      apptsRes.data?.forEach((a: any) => {
        const name = a.doctors?.full_name || 'N/A'
        docMap[name] = (docMap[name] || 0) + 1
      })
      setDoctorData(Object.entries(docMap).map(([name, consultas]) => ({ name, consultas })))
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (clinicId && !loading) loadData(clinicId) }, [period])

  const exportXLSX = () => {
    const data = appointments.map((a) => ({
      Paciente: a.patients?.full_name || '',
      Médico: a.doctors?.full_name || '',
      Data: a.date,
      Horário: a.start_time?.slice(0, 5) || '',
      Status: a.status,
      Tipo: a.type,
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos')
    ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }]
    XLSX.writeFile(wb, `relatorio_clinica_${format(new Date(), 'yyyy-MM')}.xlsx`)
  }

  const completed = appointments.filter(a => a.status === 'completed').length
  const cancelled = appointments.filter(a => a.status === 'cancelled').length
  const revenue = completed * 40

  if (!clinicId) {
    return (
      <DashboardLayout>
        <PageHeader title="Relatórios" subtitle="Relatórios da clínica" />
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Você não está vinculado a nenhuma clínica.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios e métricas da clínica"
        action={
          <button
            onClick={exportXLSX}
            disabled={appointments.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        }
      />

      {networkError && (
        <Toast message={networkError.message} type="error" onClose={() => clearError()} />
      )}

      {/* Período */}
      <div className="flex gap-3 mb-6">
        {(['month', 'quarter', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p === 'month' ? 'Este Mês' : p === 'quarter' ? 'Trimestre' : 'Este Ano'}
          </button>
        ))}
      </div>

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
            <StatCard label="Total de Consultas" value={appointments.length} icon={Calendar} color="bg-blue-500" loading={loading} />
            <StatCard label="Concluídas" value={completed} icon={Calendar} color="bg-green-500" loading={loading} />
            <StatCard label="Pacientes" value={patients.length} icon={Users} color="bg-purple-500" loading={loading} />
            <StatCard label="Receita Estimada" value={`R$ ${revenue}`} icon={DollarSign} color="bg-yellow-500" loading={loading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Status */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Consultas por Status
              </h2>
              {statusData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Por médico */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Consultas por Médico
              </h2>
              {doctorData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={doctorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="consultas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tendência mensal */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Consultas e Receita ao Longo do Tempo
            </h2>
            {monthlyData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="consultas" stroke="#3b82f6" strokeWidth={2} name="Consultas" />
                  <Line yAxisId="left" type="monotone" dataKey="concluidas" stroke="#10b981" strokeWidth={2} name="Concluídas" />
                  <Line yAxisId="right" type="monotone" dataKey="receita" stroke="#f59e0b" strokeWidth={2} name="Receita (R$)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabela resumo */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumo de Agendamentos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Médico</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {appointments.slice(0, 20).map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{a.patients?.full_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-600">{a.doctors?.full_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-600">{a.date} {a.start_time?.slice(0, 5)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: (STATUS_COLORS[a.status] || '#6b7280') + '20', color: STATUS_COLORS[a.status] || '#6b7280' }}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {appointments.length > 20 && (
                <p className="text-sm text-gray-500 text-center py-3">Mostrando 20 de {appointments.length} registros</p>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
