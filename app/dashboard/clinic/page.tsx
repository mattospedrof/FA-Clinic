'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Users, Calendar, TrendingUp, DollarSign, UserPlus, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function ClinicDashboard() {
  const [metrics, setMetrics] = useState<any>({})
  const [filters, setFilters] = useState({ startDate: '', endDate: '', minAge: '', maxAge: '', gender: '' })
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    let apptQuery = supabase.from('appointments').select('*')
    let patientQuery = supabase.from('patients').select('*')

    // Aplicar filtros de data
    if (filters.startDate) {
      apptQuery = apptQuery.gte('date', filters.startDate)
    }
    if (filters.endDate) {
      apptQuery = apptQuery.lte('date', filters.endDate)
    }

    const { data: appts } = await apptQuery
    const { data: allPatients } = await patientQuery

    // Filtrar pacientes por idade e gênero
    let patients = allPatients || []
    if (filters.minAge || filters.maxAge || filters.gender) {
      patients = patients.filter((p: any) => {
        if (!p.date_of_birth) return false
        const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()
        if (filters.minAge && age < parseInt(filters.minAge)) return false
        if (filters.maxAge && age > parseInt(filters.maxAge)) return false
        if (filters.gender && p.gender !== filters.gender) return false
        return true
      })
    }

    const patientIds = patients.map((p: any) => p.id)

    // Filtrar agendamentos pelos pacientes filtrados
    const filteredAppts = filters.minAge || filters.maxAge || filters.gender
      ? appts?.filter((a: any) => patientIds.includes(a.patient_id)) || []
      : appts || []

    const completed = filteredAppts.filter((a: any) => a.status === 'completed') || []

    setMetrics({
      totalPatients: patients.length,
      totalAppointments: filteredAppts.length,
      completedAppointments: completed.length,
      newPatients: patients.filter((p: any) => {
        const d = new Date(p.created_at)
        const now = new Date()
        return d.getMonth() === now.getMonth()
      }).length,
      estimatedRevenue: completed.length * 40,
      avgTicket: completed.length > 0 ? Math.round((completed.length * 40) / completed.length) : 40,
    })

    const byWeek: Record<string, any> = {}
    filteredAppts.forEach((a: any) => {
      const d = new Date(a.date)
      const week = `Sem ${getWeekNumber(d)}`
      if (!byWeek[week]) byWeek[week] = { week, consultas: 0, pacientes: new Set() }
      byWeek[week].consultas++
      byWeek[week].pacientes.add(a.patient_id)
    })
    setChartData(Object.values(byWeek).map((w: any) => ({ ...w, pacientes: w.pacientes.size })))
    setLoading(false)
  }

  const cards = [
    { label: 'Pacientes', value: metrics.totalPatients, icon: Users, color: 'bg-blue-500' },
    { label: 'Novos este Mês', value: metrics.newPatients, icon: UserPlus, color: 'bg-green-500' },
    { label: 'Consultas Concluídas', value: metrics.completedAppointments, icon: Calendar, color: 'bg-yellow-500' },
    { label: 'Receita Estimada', value: `R$ ${metrics.estimatedRevenue}`, icon: DollarSign, color: 'bg-purple-500' },
    { label: 'Ticket Médio', value: `R$ ${metrics.avgTicket}`, icon: TrendingUp, color: 'bg-red-500' },
    { label: 'Total Agendamentos', value: metrics.totalAppointments, icon: Calendar, color: 'bg-indigo-500' },
  ]

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard da Clínica</h1>
        <p className="text-gray-500 mt-1">Métricas e indicadores</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-700">Filtros</h3>
          </div>
          <button
            onClick={loadMetrics}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            Aplicar Filtros
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label="Data início" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label="Data fim" />
          <input type="number" placeholder="Idade mín" value={filters.minAge} onChange={(e) => setFilters({ ...filters, minAge: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label="Idade mínima" />
          <input type="number" placeholder="Idade máx" value={filters.maxAge} onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label="Idade máxima" />
          <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label="Gênero">
            <option value="">Todos os gêneros</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="NB">Não-binário</option>
          </select>
        </div>
        {(filters.startDate || filters.endDate || filters.minAge || filters.maxAge || filters.gender) && (
          <button
            onClick={() => setFilters({ startDate: '', endDate: '', minAge: '', maxAge: '', gender: '' })}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : card.value}</p>
                </div>
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Consultas por Semana</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pacientes Ativos por Semana</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pacientes" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  )
}

function getWeekNumber(d: Date) {
  const oneJan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)
}
