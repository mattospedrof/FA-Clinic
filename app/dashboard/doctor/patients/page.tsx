'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Users, Calendar } from 'lucide-react'
import { PageHeader, StatCard, DataTable, SearchInput } from '@/components/ui'
import { calculateAge } from '@/lib/utils'

const GENDER_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  NB: 'Não-binário',
  O: 'Outro',
  PNS: 'Prefiro não dizer',
}

const INSURANCE_LABELS: Record<string, string> = {
  particular: 'Particular',
  convenio: 'Convênio',
  sus: 'SUS',
}

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => { loadPatients() }, [])

  const loadPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Pacientes que o médico já atendeu (via appointments)
    const { data: appts } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', user.id)

    const patientIds = [...new Set(appts?.map((a: any) => a.patient_id))]

    if (patientIds.length > 0) {
      const { data: patientsData } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds)

      // Contar consultas por paciente
      const visitCount = patientIds.map((id) => ({
        patient_id: id,
        count: appts?.filter((a: any) => a.patient_id === id).length || 0,
      }))

      setPatients(patientsData?.map((p) => ({
        ...p,
        visit_count: visitCount.find((v) => v.patient_id === p.id)?.count || 0,
      })) || [])
    }

    setLoading(false)
  }

  const filteredPatients = patients.filter((p) =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf?.includes(searchTerm) ||
    p.phone?.includes(searchTerm)
  )

  const columns = [
    {
      key: 'full_name',
      label: 'Nome',
      render: (row: any) => <span className="font-medium text-gray-800">{row.full_name}</span>,
    },
    {
      key: 'age',
      label: 'Idade',
      render: (row: any) => row.date_of_birth ? `${calculateAge(row.date_of_birth)} anos` : '—',
    },
    {
      key: 'gender',
      label: 'Gênero',
      render: (row: any) => row.gender ? GENDER_LABELS[row.gender] : '—',
    },
    {
      key: 'phone',
      label: 'Telefone',
    },
    {
      key: 'insurance_type',
      label: 'Convênio',
      render: (row: any) => row.insurance_type ? INSURANCE_LABELS[row.insurance_type] : '—',
    },
    {
      key: 'visits',
      label: 'Consultas',
      render: (row: any) => (
        <span className="flex items-center gap-1 text-gray-600">
          <Calendar className="w-3 h-3" />
          {row.visit_count || 0}
        </span>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Meus Pacientes"
        subtitle="Pacientes atendidos por você"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Pacientes" value={patients.length} icon={Users} color="bg-blue-500" loading={loading} />
        <StatCard label="Particulares" value={patients.filter(p => p.insurance_type === 'particular').length} icon={Users} color="bg-yellow-500" loading={loading} />
        <StatCard label="Com Convênio" value={patients.filter(p => p.insurance_type !== 'particular').length} icon={Users} color="bg-green-500" loading={loading} />
      </div>

      <div className="mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, CPF ou telefone..." />
      </div>

      <DataTable columns={columns} data={filteredPatients} loading={loading} emptyMessage="Nenhum paciente atendido ainda" />
    </DashboardLayout>
  )
}
