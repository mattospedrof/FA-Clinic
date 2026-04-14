'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import {
  Users, DollarSign, Calendar, UserCog, Activity,
  ArrowLeft, Download, Filter, FileDown, Search,
  Settings2, Pencil, Trash2, Eye, EyeOff
} from 'lucide-react'
import { PageHeader, StatCard, Badge, Toast, Modal, Skeleton } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calculateAge } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { removeDoctorFromClinic, removePatientFromClinic, updatePatient, updateMedicalRecord } from '@/app/actions'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const INSURANCE_LABELS: Record<string, string> = { particular: 'Particular', convenio: 'Convênio', sus: 'SUS' }
const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}
const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  doctor: '#3b82f6',
  receptionist: '#10b981',
}

type PeriodFilter = 'this_month' | 'last_month' | 'custom'

// Colunas disponíveis para pacientes
const PATIENT_COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'age', label: 'Idade' },
  { key: 'gender', label: 'Gênero' },
  { key: 'phone', label: 'Telefone' },
  { key: 'insurance', label: 'Convênio' },
  { key: 'city', label: 'Cidade' },
  { key: 'daysActive', label: 'Dias Ativos' },
]

// Colunas disponíveis para médicos
const DOCTOR_COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'specialty', label: 'Especialidade' },
  { key: 'crm', label: 'CRM' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'role', label: 'Função' },
  { key: 'status', label: 'Status' },
]

export default function ClinicDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clinicId = params.id as string

  const [clinic, setClinic] = useState<any>(null)
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [period, setPeriod] = useState<PeriodFilter>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [insuranceData, setInsuranceData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [showExport, setShowExport] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(['patient', 'date', 'time', 'doctor', 'status'])
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('')
  
  // Colunas visíveis
  const [visiblePatientCols, setVisiblePatientCols] = useState<string[]>(['name', 'age', 'gender', 'phone', 'insurance', 'city', 'daysActive'])
  const [visibleDoctorCols, setVisibleDoctorCols] = useState<string[]>(['name', 'specialty', 'crm', 'email', 'phone', 'role', 'status'])
  const [showPatientColSelector, setShowPatientColSelector] = useState(false)
  const [showDoctorColSelector, setShowDoctorColSelector] = useState(false)
  
  // Modais de edição/exclusão
  const [editingPatient, setEditingPatient] = useState<any>(null)
  const [editingDoctor, setEditingDoctor] = useState<any>(null)
  const [deletingPatient, setDeletingPatient] = useState<any>(null)
  const [deletingDoctor, setDeletingDoctor] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => { loadClinic() }, [clinicId])
  useEffect(() => { if (clinic) loadData() }, [period, customStart, customEnd, clinic])

  const loadClinic = async () => {
    setLoading(true)
    const { data } = await supabase.from('clinics').select('*').eq('id', clinicId).single()
    if (data) {
      setClinic(data)
      setLoading(false)
    } else {
      setToast({ message: 'Clínica não encontrada', type: 'error' })
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    if (period === 'this_month') return { start: startOfMonth(now), end: endOfMonth(now) }
    if (period === 'last_month') return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
    if (customStart && customEnd) return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') }
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }

  const loadData = async () => {
    setDataLoading(true)
    const { start, end } = getDateRange()

    const [apptsRes, patientsRes, doctorsRes, allApptsRes] = await Promise.all([
      supabase.from('appointments').select('*, patients(full_name, cpf, insurance_type), doctors:profiles(full_name)')
        .eq('clinic_id', clinicId).gte('date', start.toISOString().split('T')[0]).lte('date', end.toISOString().split('T')[0]),
      supabase.from('clinic_patients').select('*, patients(full_name, date_of_birth, gender, created_at, insurance_type, phone, city, state, cpf)').eq('clinic_id', clinicId),
      supabase.from('doctor_clinics').select('*, profiles(full_name, email, phone, role)').eq('clinic_id', clinicId),
      supabase.from('appointments').select('*, patients(id, full_name, date_of_birth, gender, insurance_type, phone, city, state, cpf, created_at), doctors:profiles(id, full_name, email, phone, role)')
        .eq('clinic_id', clinicId),
    ])

    const appts = apptsRes.data || []
    const patsFromJunction = patientsRes.data?.map((p: any) => p.patients).filter(Boolean) || []
    const docsFromJunction = doctorsRes.data || []
    const allAppts = allApptsRes.data || []

    // Fallback: derivar pacientes e médicos dos agendamentos
    const patientIdsFromAppts = new Set<string>()
    const doctorIdsFromAppts = new Set<string>()
    const patientDataFromAppts: Record<string, any> = {}
    const doctorDataFromAppts: Record<string, any> = {}

    allAppts.forEach((a: any) => {
      if (a.patient_id) patientIdsFromAppts.add(a.patient_id)
      if (a.doctor_id) doctorIdsFromAppts.add(a.doctor_id)
      if (a.patients) patientDataFromAppts[a.patients.id] = a.patients
      if (a.doctors) doctorDataFromAppts[a.doctors.id] = a.doctors
    })

    let finalPatients = patsFromJunction
    if (patsFromJunction.length === 0 && Object.keys(patientDataFromAppts).length > 0) {
      finalPatients = Object.values(patientDataFromAppts)
    }

    let finalDoctors = docsFromJunction
    if (docsFromJunction.length === 0 && Object.keys(doctorDataFromAppts).length > 0) {
      finalDoctors = Array.from(doctorIdsFromAppts).map(id => ({
        id,
        doctor_id: id,
        profiles: doctorDataFromAppts[id],
        specialty: 'Geral',
        crm: 'N/A',
        is_available: true,
      }))
    }

    setAppointments(appts)
    setPatients(finalPatients)
    setDoctors(finalDoctors)

    const completed = appts.filter((a: any) => a.status === 'completed').length
    const avgTicket = clinic?.avg_ticket || 40
    const totalPatients = finalPatients.length

    const byInsurance: Record<string, number> = {}
    appts.forEach((a: any) => {
      const type = a.patients?.insurance_type || 'particular'
      byInsurance[type] = (byInsurance[type] || 0) + 1
    })
    setInsuranceData(Object.entries(byInsurance).map(([name, value]) => ({ name: INSURANCE_LABELS[name] || name, value })))

    const byStatus: Record<string, number> = {}
    appts.forEach((a: any) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1 })
    setStatusData(Object.entries(byStatus).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })))

    setStats({
      totalPatients,
      totalDoctors: finalDoctors.length,
      totalAppointments: appts.length,
      completed,
      revenue: completed * avgTicket,
      avgAge: finalPatients.length > 0 ? Math.round(finalPatients.reduce((sum: number, p: any) => {
        if (!p.date_of_birth) return sum
        return sum + (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear())
      }, 0) / finalPatients.length) : 0,
    })

    setDataLoading(false)
  }

  const exportXLSX = () => {
    const colMap: Record<string, { label: string; fn: (a: any) => string }> = {
      patient: { label: 'Paciente', fn: (a) => a.patients?.full_name || '' },
      date: { label: 'Data', fn: (a) => a.date || '' },
      time: { label: 'Horário', fn: (a) => a.start_time?.slice(0, 5) || '' },
      doctor: { label: 'Médico', fn: (a) => a.doctors?.full_name || '' },
      status: { label: 'Status', fn: (a) => a.status || '' },
      type: { label: 'Tipo', fn: (a) => a.type || '' },
      insurance: { label: 'Convênio', fn: (a) => INSURANCE_LABELS[a.patients?.insurance_type] || '' },
      notes: { label: 'Notas', fn: (a) => a.notes || '' },
    }

    const cols = selectedCols.map((k) => colMap[k]).filter(Boolean)
    const data = appointments.map((a) => {
      const row: Record<string, string> = {}
      cols.forEach((c) => { row[c.label] = c.fn(a) })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos')
    ws['!cols'] = cols.map(() => ({ wch: 20 }))
    const periodLabel = period === 'this_month' ? 'este_mes' : period === 'last_month' ? 'mes_passado' : 'personalizado'
    XLSX.writeFile(wb, `clinica_${clinic?.name?.replace(/\s/g, '_')}_${periodLabel}.xlsx`)
    setShowExport(false)
    setToast({ message: 'Exportação concluída', type: 'success' })
  }

  // Handlers de pacientes
  const handleDeletePatient = async (patient: any) => {
    const result = await removePatientFromClinic(clinicId, patient.id)
    if (result.success) {
      setToast({ message: 'Paciente removido com sucesso', type: 'success' })
      setDeletingPatient(null)
      loadData()
    } else {
      setToast({ message: result.error || 'Erro ao remover paciente', type: 'error' })
    }
  }

  // handlers de médicos
  const handleDeleteDoctor = async (doctor: any) => {
    const doctorId = doctor.doctor_id || doctor.id
    const result = await removeDoctorFromClinic(clinicId, doctorId)
    if (result.success) {
      setToast({ message: 'Médico removido com sucesso', type: 'success' })
      setDeletingDoctor(null)
      loadData()
    } else {
      setToast({ message: result.error || 'Erro ao remover médico', type: 'error' })
    }
  }

  const filteredPatients = patients.filter((p: any) => {
    if (!patientSearch) return true
    const term = patientSearch.toLowerCase()
    return (
      p.full_name?.toLowerCase().includes(term) ||
      p.cpf?.includes(term) ||
      p.city?.toLowerCase().includes(term)
    )
  })

  const filteredDoctors = doctors.filter((d: any) => {
    if (!doctorSearch && !doctorSpecialtyFilter) return true
    const term = doctorSearch?.toLowerCase() || ''
    const matchesSearch = !term || (
      d.profiles?.full_name?.toLowerCase().includes(term) ||
      d.specialty?.toLowerCase().includes(term) ||
      d.crm?.includes(term)
    )
    const matchesSpecialty = !doctorSpecialtyFilter || d.specialty === doctorSpecialtyFilter
    return matchesSearch && matchesSpecialty
  })

  const uniqueSpecialties = Array.from(new Set(doctors.map((d: any) => d.specialty).filter(Boolean))).sort()

  if (!clinic && !loading) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-xl shadow p-6 text-center py-12">
          <p className="text-gray-500">Clínica não encontrada</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Voltar</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/dashboard/admin')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{clinic?.name || 'Carregando...'}</h1>
          <p className="text-gray-500 mt-1">{clinic?.city}/{clinic?.state} • {clinic?.address || ''}</p>
        </div>
      </div>

      {/* Filtros de período + Export */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          {(['this_month', 'last_month', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === 'this_month' ? 'Este Mês' : p === 'last_month' ? 'Mês Passado' : 'Personalizado'}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400">até</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="flex-1" />
          <button onClick={() => setShowExport(true)} className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm font-medium">
            <Download className="w-4 h-4" /> Exportar XLSX
          </button>
        </div>
      </div>

      {/* Cards de métricas */}
      {dataLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="Pacientes" value={stats.totalPatients} icon={Users} color="bg-blue-500" />
            <StatCard label="Médicos" value={stats.totalDoctors} icon={UserCog} color="bg-green-500" />
            <StatCard label="Agendamentos" value={stats.totalAppointments} icon={Calendar} color="bg-yellow-500" />
            <StatCard label="Concluídas" value={stats.completed} icon={Activity} color="bg-purple-500" />
            <StatCard label="Receita" value={`R$ ${stats.revenue}`} icon={DollarSign} color="bg-indigo-500" />
            <StatCard label="Idade Média" value={`${stats.avgAge} anos`} icon={Users} color="bg-pink-500" />
          </div>

          {/* Seção de Pacientes */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Pacientes desta Clínica</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{filteredPatients.length} de {patients.length}</span>
                <button
                  onClick={() => setShowPatientColSelector(!showPatientColSelector)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Selecionar colunas visíveis"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Seletor de colunas */}
            {showPatientColSelector && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Colunas visíveis:</p>
                <div className="flex flex-wrap gap-3">
                  {PATIENT_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visiblePatientCols.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisiblePatientCols([...visiblePatientCols, col.key])
                          else setVisiblePatientCols(visiblePatientCols.filter((c) => c !== col.key))
                        }}
                        className="rounded border-gray-300"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Busca */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou cidade..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {patients.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum paciente vinculado a esta clínica</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum paciente encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {visiblePatientCols.includes('name') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                      )}
                      {visiblePatientCols.includes('age') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Idade</th>
                      )}
                      {visiblePatientCols.includes('gender') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Gênero</th>
                      )}
                      {visiblePatientCols.includes('phone') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Telefone</th>
                      )}
                      {visiblePatientCols.includes('insurance') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Convênio</th>
                      )}
                      {visiblePatientCols.includes('city') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cidade</th>
                      )}
                      {visiblePatientCols.includes('daysActive') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Dias Ativos</th>
                      )}
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPatients.slice(0, 25).map((p: any) => {
                      const age = p.date_of_birth ? calculateAge(new Date(p.date_of_birth)) : null
                      const daysActive = p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          {visiblePatientCols.includes('name') && (
                            <td className="px-4 py-3 font-medium text-gray-800">{p.full_name}</td>
                          )}
                          {visiblePatientCols.includes('age') && (
                            <td className="px-4 py-3 text-gray-600">{age ? `${age} anos` : '—'}</td>
                          )}
                          {visiblePatientCols.includes('gender') && (
                            <td className="px-4 py-3 text-gray-600">{p.gender || '—'}</td>
                          )}
                          {visiblePatientCols.includes('phone') && (
                            <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                          )}
                          {visiblePatientCols.includes('insurance') && (
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                p.insurance_type === 'particular' ? 'bg-blue-100 text-blue-800' :
                                p.insurance_type === 'convenio' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {INSURANCE_LABELS[p.insurance_type] || '—'}
                              </span>
                            </td>
                          )}
                          {visiblePatientCols.includes('city') && (
                            <td className="px-4 py-3 text-gray-600">{p.city ? `${p.city}/${p.state || ''}` : '—'}</td>
                          )}
                          {visiblePatientCols.includes('daysActive') && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {daysActive} dias
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingPatient(p)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar paciente"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingPatient(p)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remover paciente da clínica"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredPatients.length > 25 && <p className="text-sm text-gray-500 text-center py-3">Mostrando 25 de {filteredPatients.length}</p>}
              </div>
            )}
          </div>

          {/* Seção de Médicos */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Médicos desta Clínica</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{filteredDoctors.length} de {doctors.length}</span>
                <button
                  onClick={() => setShowDoctorColSelector(!showDoctorColSelector)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Selecionar colunas visíveis"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Seletor de colunas */}
            {showDoctorColSelector && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Colunas visíveis:</p>
                <div className="flex flex-wrap gap-3">
                  {DOCTOR_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleDoctorCols.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleDoctorCols([...visibleDoctorCols, col.key])
                          else setVisibleDoctorCols(visibleDoctorCols.filter((c) => c !== col.key))
                        }}
                        className="rounded border-gray-300"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Busca + Filtro */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, especialidade ou CRM..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              {uniqueSpecialties.length > 0 && (
                <select
                  value={doctorSpecialtyFilter}
                  onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white min-w-[200px]"
                >
                  <option value="">Todas especialidades</option>
                  {uniqueSpecialties.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            {doctors.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum médico vinculado a esta clínica</p>
            ) : filteredDoctors.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum médico encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {visibleDoctorCols.includes('name') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                      )}
                      {visibleDoctorCols.includes('specialty') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Especialidade</th>
                      )}
                      {visibleDoctorCols.includes('crm') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">CRM</th>
                      )}
                      {visibleDoctorCols.includes('email') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                      )}
                      {visibleDoctorCols.includes('phone') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Telefone</th>
                      )}
                      {visibleDoctorCols.includes('role') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Função</th>
                      )}
                      {visibleDoctorCols.includes('status') && (
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      )}
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDoctors.slice(0, 25).map((d: any) => {
                      const role = d.profiles?.role || 'doctor'
                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          {visibleDoctorCols.includes('name') && (
                            <td className="px-4 py-3 font-medium text-gray-800">{d.profiles?.full_name || '—'}</td>
                          )}
                          {visibleDoctorCols.includes('specialty') && (
                            <td className="px-4 py-3 text-gray-600">{d.specialty || '—'}</td>
                          )}
                          {visibleDoctorCols.includes('crm') && (
                            <td className="px-4 py-3 text-gray-600">{d.crm || '—'}</td>
                          )}
                          {visibleDoctorCols.includes('email') && (
                            <td className="px-4 py-3 text-gray-600">{d.profiles?.email || '—'}</td>
                          )}
                          {visibleDoctorCols.includes('phone') && (
                            <td className="px-4 py-3 text-gray-600">{d.profiles?.phone || '—'}</td>
                          )}
                          {visibleDoctorCols.includes('role') && (
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${ROLE_COLORS[role] || '#6b7280'}20`,
                                  color: ROLE_COLORS[role] || '#6b7280',
                                }}
                              >
                                {role === 'admin' ? 'Administrador' : role === 'doctor' ? 'Médico' : 'Recepcionista'}
                              </span>
                            </td>
                          )}
                          {visibleDoctorCols.includes('status') && (
                            <td className="px-4 py-3">
                              <Badge status={d.is_available ? 'completed' : 'cancelled'} />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingDoctor(d)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar médico"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingDoctor(d)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remover médico da clínica"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredDoctors.length > 25 && <p className="text-sm text-gray-500 text-center py-3">Mostrando 25 de {filteredDoctors.length}</p>}
              </div>
            )}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Agendamentos por Convênio</h2>
              {insuranceData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="65%" height={250}>
                    <PieChart>
                      <Pie data={insuranceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                        {insuranceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3">
                    {insuranceData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-sm text-gray-700">{item.name}: <strong>{item.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Status dos Agendamentos</h2>
              {statusData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Export */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Exportar Agendamentos">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecione as colunas para exportar:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'patient', label: 'Paciente' },
              { key: 'date', label: 'Data' },
              { key: 'time', label: 'Horário' },
              { key: 'doctor', label: 'Médico' },
              { key: 'status', label: 'Status' },
              { key: 'type', label: 'Tipo' },
              { key: 'insurance', label: 'Convênio' },
              { key: 'notes', label: 'Notas' },
            ].map((col) => (
              <label key={col.key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCols.includes(col.key)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedCols([...selectedCols, col.key])
                    else setSelectedCols(selectedCols.filter((c) => c !== col.key))
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={exportXLSX} disabled={selectedCols.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Exportar
            </button>
            <button onClick={() => setShowExport(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmação excluir paciente */}
      <Modal open={!!deletingPatient} onClose={() => setDeletingPatient(null)} title="Remover Paciente">
        {deletingPatient && (
          <div className="space-y-4">
            <p className="text-gray-700">Tem certeza que deseja remover <strong>{deletingPatient.full_name}</strong> desta clínica?</p>
            <p className="text-sm text-gray-500">O paciente não será excluído do sistema, apenas desvinculado desta clínica.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => handleDeletePatient(deletingPatient)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">Remover</button>
              <button onClick={() => setDeletingPatient(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmação excluir médico */}
      <Modal open={!!deletingDoctor} onClose={() => setDeletingDoctor(null)} title="Remover Médico">
        {deletingDoctor && (
          <div className="space-y-4">
            <p className="text-gray-700">Tem certeza que deseja remover <strong>{deletingDoctor.profiles?.full_name || 'médico'}</strong> desta clínica?</p>
            <p className="text-sm text-gray-500">O médico não será excluído do sistema, apenas desvinculado desta clínica.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => handleDeleteDoctor(deletingDoctor)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">Remover</button>
              <button onClick={() => setDeletingDoctor(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
