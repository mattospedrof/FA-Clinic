'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users, Calendar, DollarSign, ArrowUpRight, Edit, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const BASE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#e11d48']

/** Gera exatamente N cores únicas. Se N <= 12, usa paleta fixa. Se N > 12, gera cores extras via HSL. */
function getUniqueColors(n: number): string[] {
  if (n <= BASE_COLORS.length) return BASE_COLORS.slice(0, n)
  // Gera cores extras espaçadas no HSL para evitar repetição próxima
  const extra = n - BASE_COLORS.length
  const colors = [...BASE_COLORS]
  for (let i = 0; i < extra; i++) {
    const hue = Math.round((i / extra) * 360)
    const sat = 65 + (i % 3) * 10
    const light = 45 + (i % 2) * 10
    colors.push(`hsl(${hue}, ${sat}%, ${light}%)`)
  }
  return colors
}

type ChartFilter = 'month' | 'year' | 'all'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<any>({ clinics: 0, patients: 0, appointments: 0, revenue: 0 })
  const [clinics, setClinics] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all')
  const [allAppts, setAllAppts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (allAppts.length > 0) updateCharts() }, [chartFilter, allAppts, clinics])

  const loadData = async () => {
    const [cRes, pRes, aRes] = await Promise.all([
      supabase.from('clinics').select('*').eq('is_active', true),
      supabase.from('patients').select('*'),
      supabase.from('appointments').select('*'),
    ])
    const clinicsData = cRes.data || []
    const patientsData = pRes.data || []
    const apptsData = aRes.data || []

    setStats({
      clinics: clinicsData.length,
      patients: patientsData.length,
      appointments: apptsData.length,
      revenue: apptsData.filter((a: any) => a.status === 'completed').length * 40,
    })
    setClinics(clinicsData)
    setAllAppts(apptsData)
    setLoading(false)
  }

  const updateCharts = () => {
    const now = new Date()
    const filtered = allAppts.filter((a: any) => {
      if (chartFilter === 'all') return true
      if (chartFilter === 'year') return new Date(a.date).getFullYear() === now.getFullYear()
      const d = new Date(a.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    // Barras - consultas por clínica (ordem decrescente)
    const barData = clinics
      .map((c: any) => ({
        name: c.name,
        consultas: filtered.filter((a: any) => a.clinic_id === c.id).length,
      }))
      .filter((d: any) => d.consultas > 0)
      .sort((a: any, b: any) => b.consultas - a.consultas)
    setChartData(barData)

    // Pizza - com porcentagem correta (ordem decrescente)
    const totalConsultas = filtered.length
    const pieDataRaw = clinics
      .map((c: any) => {
        const consultas = filtered.filter((a: any) => a.clinic_id === c.id).length
        return {
          name: c.name,
          value: consultas,
          percent: totalConsultas > 0 ? ((consultas / totalConsultas) * 100).toFixed(1) : '0',
        }
      })
      .filter((d: any) => d.value > 0)
      .sort((a: any, b: any) => b.value - a.value)
    setPieData(pieDataRaw)
  }

  const cards = [
    { label: 'Clínicas', value: stats.clinics, icon: Building2, color: 'bg-blue-500' },
    { label: 'Pacientes', value: stats.patients, icon: Users, color: 'bg-green-500' },
    { label: 'Agendamentos', value: stats.appointments, icon: Calendar, color: 'bg-yellow-500' },
    { label: 'Receita Estimada', value: `R$ ${stats.revenue}`, icon: DollarSign, color: 'bg-purple-500' },
  ]

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Geral</h1>
        <p className="text-gray-500 mt-1">Resumo de clientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros dos gráficos */}
      <div className="flex gap-3 mb-6">
        {([['month', 'Este Mês'], ['year', 'Este Ano'], ['all', 'Todo Período']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setChartFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              chartFilter === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Barras */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Consultas por Clínica</h2>
          {chartData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sem dados para o período</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={false} axisLine={false} />
                <YAxis allowDataOverflow />
                <Tooltip
                  contentStyle={{ borderRadius: 8 }}
                  formatter={(value: any, _name: any, entry: any) => [`${value} consultas`, entry?.payload?.name || '']}
                  cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                />
                <Bar dataKey="consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pizza com legenda lateral */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Clínica</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sem dados para o período</p>
          ) : (() => {
            const chartColors = getUniqueColors(pieData.length)
            return (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={chartColors[i % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} consultas`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legenda lateral */}
                <div className="flex-1 space-y-2">
                  {pieData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                      <span className="text-sm text-gray-700 truncate" title={item.name}>
                        {item.name} ({item.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

    </DashboardLayout>
  )
}
