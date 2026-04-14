'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { FileText, Building2, Users, Calendar, DollarSign, Download } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  clinic: '#f59e0b',
  doctor: '#3b82f6',
  staff: '#10b981',
  patient: '#8b5cf6',
}
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  clinic: 'Clínica',
  doctor: 'Médico',
  staff: 'Staff',
  patient: 'Paciente',
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [clinics, setClinics] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [clinicApptData, setClinicApptData] = useState<any[]>([])
  const [roleData, setRoleData] = useState<any[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [cRes, uRes, aRes] = await Promise.all([
      supabase.from('clinics').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*, clinics(name), doctors:profiles(full_name)').order('date', { ascending: false }),
    ])

    setClinics(cRes.data || [])
    setUsers(uRes.data || [])
    setAppointments(aRes.data || [])

    // Consultas por clínica
    const clinicMap: Record<string, { name: string; total: number; completed: number; cancelled: number }> = {}
    aRes.data?.forEach((a: any) => {
      const name = a.clinics?.name || 'N/A'
      if (!clinicMap[name]) clinicMap[name] = { name, total: 0, completed: 0, cancelled: 0 }
      clinicMap[name].total++
      if (a.status === 'completed') clinicMap[name].completed++
      if (a.status === 'cancelled') clinicMap[name].cancelled++
    })
    setClinicApptData(Object.values(clinicMap))

    // Usuários por role
    const roleMap: Record<string, number> = {}
    uRes.data?.forEach((u: any) => {
      roleMap[u.role] = (roleMap[u.role] || 0) + 1
    })
    setRoleData(Object.entries(roleMap).map(([name, value]) => ({ name: ROLE_LABELS[name] || name, value })))

    // Receita mensal
    const revMap: Record<string, number> = {}
    aRes.data?.filter((a: any) => a.status === 'completed').forEach((a: any) => {
      const month = format(parseISO(a.date), 'MMM/yyyy', { locale: ptBR })
      revMap[month] = (revMap[month] || 0) + 40
    })
    setMonthlyRevenue(Object.entries(revMap).map(([month, revenue]) => ({ month, revenue })))

    setLoading(false)
  }

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new()

    // Clínicas
    const clinicData = clinics.map((c) => ({
      Nome: c.name,
      Cidade: c.city,
      Estado: c.state,
      Ativa: c.is_active ? 'Sim' : 'Não',
      Criada_em: c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '',
    }))
    const ws1 = XLSX.utils.json_to_sheet(clinicData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Clínicas')

    // Usuários
    const userData = users.map((u) => ({
      Nome: u.full_name || u.email,
      Email: u.email,
      Role: u.role,
      Criado_em: u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '',
    }))
    const ws2 = XLSX.utils.json_to_sheet(userData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Usuários')

    // Agendamentos
    const apptData = appointments.map((a) => ({
      Clínica: a.clinics?.name || '',
      Paciente: a.patient_id,
      Médico: a.doctors?.full_name || '',
      Data: a.date,
      Status: a.status,
    }))
    const ws3 = XLSX.utils.json_to_sheet(apptData)
    XLSX.utils.book_append_sheet(wb, ws3, 'Agendamentos')

    XLSX.writeFile(wb, `relatorio_global_${format(new Date(), 'yyyy-MM')}.xlsx`)
  }

  const completed = appointments.filter(a => a.status === 'completed').length
  const totalRevenue = completed * 40

  return (
    <DashboardLayout>
      <PageHeader
        title="Relatórios Gerais"
        subtitle="Visão completa de todo o sistema"
        action={
          <button
            onClick={exportXLSX}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Clínicas" value={clinics.length} icon={Building2} color="bg-blue-500" loading={loading} />
        <StatCard label="Usuários" value={users.length} icon={Users} color="bg-green-500" loading={loading} />
        <StatCard label="Agendamentos" value={appointments.length} icon={Calendar} color="bg-yellow-500" loading={loading} />
        <StatCard label="Receita Total" value={`R$ ${totalRevenue}`} icon={DollarSign} color="bg-purple-500" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Usuários por Role */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            Usuários por Role
          </h2>
          {roleData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={roleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {roleData.map((entry, i) => (
                    <Cell key={i} fill={Object.values(ROLE_COLORS)[i % Object.values(ROLE_COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Consultas por Clínica */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Consultas por Clínica
          </h2>
          {clinicApptData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={clinicApptData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Receita Mensal */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-500" />
          Receita Mensal Estimada
        </h2>
        {monthlyRevenue.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => `R$ ${value}`} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela de clínicas */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Desempenho por Clínica</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Clínica</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Concluídas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Canceladas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receita Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clinicApptData.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3">{c.total}</td>
                  <td className="px-4 py-3 text-green-600">{c.completed}</td>
                  <td className="px-4 py-3 text-red-600">{c.cancelled}</td>
                  <td className="px-4 py-3 font-medium">R$ {c.completed * 40}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
