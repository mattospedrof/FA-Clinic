'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Edit, Trash2 } from 'lucide-react'
import { PageHeader, StatCard, DataTable, Badge, Modal, Toast, SearchInput } from '@/components/ui'
import { createPatient, updatePatient, deletePatient } from '@/app/actions'
import { formatCpf, formatPhone, fetchCep, calculateAge } from '@/lib/utils'

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

export default function ClinicPatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<any>(null)
  const [patientData, setPatientData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadClinic(); }, [])

  const loadClinic = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obter clínica do staff logado
    const { data: staffClinics } = await supabase
      .from('clinic_staff')
      .select('clinic_id')
      .eq('user_id', user.id)

    const cId = staffClinics?.[0]?.clinic_id || null
    setClinicId(cId)

    if (cId) {
      await loadPatients(cId)
    } else {
      setLoading(false)
    }
  }

  const loadPatients = async (cId: string) => {
    // Pacientes vinculados à clínica via clinic_patients
    const { data: cp } = await supabase
      .from('clinic_patients')
      .select('patient_id')
      .eq('clinic_id', cId)

    const patientIds = cp?.map((p: any) => p.patient_id) || []

    if (patientIds.length > 0) {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds)
        .order('created_at', { ascending: false })

      if (!error) setPatients(data || [])
    } else {
      setPatients([])
    }
    setLoading(false)
  }

  const handleCepBlur = async () => {
    if (patientData.cep?.length === 8) {
      const data = await fetchCep(patientData.cep)
      if (data) {
        setPatientData({ ...patientData, address: data.logradouro, city: data.localidade, state: data.uf })
      }
    }
  }

  const handleNew = () => {
    setEditingPatient(null)
    setPatientData({ insurance_type: 'particular' })
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = (patient: any) => {
    setEditingPatient(patient)
    setPatientData(patient)
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (patient: any) => {
    if (!confirm(`Tem certeza que deseja excluir o paciente "${patient.full_name}"?`)) return

    const result = await deletePatient(patient.id)
    if (result.success) {
      setToast({ message: 'Paciente excluído com sucesso', type: 'success' })
      if (clinicId) loadPatients(clinicId)
    } else {
      setToast({ message: result.error || 'Erro ao excluir paciente', type: 'error' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const action = editingPatient
      ? updatePatient(editingPatient.id, patientData)
      : createPatient(patientData)

    const result = await action
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao salvar paciente')
      return
    }

    // Vincular paciente à clínica
    if (!editingPatient && clinicId) {
      // Buscar o ID do paciente recém-criado
      const { data: newPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('cpf', patientData.cpf || '')
        .eq('email', patientData.email || '')
        .order('created_at', { ascending: false })
        .limit(1)

      if (newPatient?.[0]) {
        await supabase.from('clinic_patients').insert({
          clinic_id: clinicId,
          patient_id: newPatient[0].id,
        }).select().maybeSingle()
      }
    }

    setToast({ message: editingPatient ? 'Paciente atualizado com sucesso' : 'Paciente criado com sucesso', type: 'success' })
    setShowModal(false)
    setPatientData({})
    setEditingPatient(null)
    if (clinicId) loadPatients(clinicId)
  }

  const filteredPatients = patients.filter((p) =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf?.includes(searchTerm) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      key: 'full_name',
      label: 'Nome',
      render: (row: any) => <span className="font-medium text-gray-800">{row.full_name}</span>,
    },
    {
      key: 'cpf',
      label: 'CPF',
      render: (row: any) => row.cpf || '—',
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
      key: 'actions',
      label: 'Ações',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row) }}
            className="text-blue-600 hover:text-blue-800"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="text-red-600 hover:text-red-800"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  if (!clinicId) {
    return (
      <DashboardLayout>
        <PageHeader title="Pacientes" subtitle="Pacientes da clínica" />
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Você não está vinculado a nenhuma clínica.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Pacientes"
        subtitle="Pacientes da clínica"
        action={
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </button>
        }
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Pacientes" value={patients.length} icon={Users} color="bg-blue-500" loading={loading} />
        <StatCard label="Particulares" value={patients.filter(p => p.insurance_type === 'particular').length} icon={Users} color="bg-yellow-500" loading={loading} />
        <StatCard label="Com Convênio" value={patients.filter(p => p.insurance_type !== 'particular').length} icon={Users} color="bg-green-500" loading={loading} />
      </div>

      <div className="mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, CPF ou e-mail..." />
      </div>

      <DataTable columns={columns} data={filteredPatients} loading={loading} emptyMessage="Nenhum paciente nesta clínica" />

      {/* Modal de Criar/Editar */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Toast message={formError} type="error" onClose={() => setFormError('')} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
              <input
                value={patientData.full_name || ''}
                onChange={(e) => setPatientData({ ...patientData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Data de Nascimento *</label>
              <input
                type="date"
                value={patientData.date_of_birth || ''}
                onChange={(e) => setPatientData({ ...patientData, date_of_birth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Gênero *</label>
              <select
                value={patientData.gender || ''}
                onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecionar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="NB">Não-binário</option>
                <option value="O">Outro</option>
                <option value="PNS">Prefiro não dizer</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">CPF</label>
              <input
                value={patientData.cpf || ''}
                onChange={(e) => setPatientData({ ...patientData, cpf: formatCpf(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Telefone *</label>
              <input
                value={patientData.phone || ''}
                onChange={(e) => setPatientData({ ...patientData, phone: formatPhone(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={patientData.email || ''}
                onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">CEP</label>
              <input
                value={patientData.cep || ''}
                onChange={(e) => setPatientData({ ...patientData, cep: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                onBlur={handleCepBlur}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Endereço</label>
              <input
                value={patientData.address || ''}
                onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Número</label>
              <input
                value={patientData.address_number || ''}
                onChange={(e) => setPatientData({ ...patientData, address_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Complemento</label>
              <input
                value={patientData.address_complement || ''}
                onChange={(e) => setPatientData({ ...patientData, address_complement: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Cidade</label>
              <input
                value={patientData.city || ''}
                onChange={(e) => setPatientData({ ...patientData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <input
                value={patientData.state || ''}
                onChange={(e) => setPatientData({ ...patientData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de Convênio</label>
              <select
                value={patientData.insurance_type || 'particular'}
                onChange={(e) => setPatientData({ ...patientData, insurance_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="particular">Particular</option>
                <option value="convenio">Convênio</option>
                <option value="sus">SUS</option>
              </select>
            </div>

            {patientData.insurance_type === 'convenio' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome do Convênio</label>
                  <input
                    value={patientData.insurance_name || ''}
                    onChange={(e) => setPatientData({ ...patientData, insurance_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Número do Convênio</label>
                  <input
                    value={patientData.insurance_number || ''}
                    onChange={(e) => setPatientData({ ...patientData, insurance_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {patientData.insurance_type === 'sus' && (
              <div>
                <label className="text-sm font-medium text-gray-700">CNIS</label>
                <input
                  value={patientData.cnis || ''}
                  onChange={(e) => setPatientData({ ...patientData, cnis: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                  placeholder="Apenas números"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Salvando...' : editingPatient ? 'Atualizar' : 'Cadastrar'}
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
