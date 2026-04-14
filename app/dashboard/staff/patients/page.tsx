'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Edit, Trash2, Filter, FileDown } from 'lucide-react'
import { PageHeader, StatCard, DataTable, Badge, Modal, Toast, SearchInput, StatCardSkeleton, TableSkeleton } from '@/components/ui'
import { createPatient, updatePatient, deletePatient } from '@/app/actions'
import { formatCpf, formatPhone, fetchCep, calculateAge } from '@/lib/utils'
import { useNetworkError } from '@/hooks/useNetworkError'
import * as XLSX from 'xlsx'

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

export default function StaffPatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ gender: '', insurance_type: '', city: '', state: '' })
  const [showExport, setShowExport] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(['full_name', 'cpf', 'phone', 'insurance_type', 'age'])
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<any>(null)
  const [patientData, setPatientData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadPatients() }, [])

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
      if (error) { handleError(error); return }
      if (!error) setPatients(data || [])
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
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
      loadPatients()
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

    setToast({ message: editingPatient ? 'Paciente atualizado com sucesso' : 'Paciente criado com sucesso', type: 'success' })
    setShowModal(false)
    setPatientData({})
    setEditingPatient(null)
    loadPatients()
  }

  const filteredPatients = patients.filter((p) => {
    const matchSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cpf?.includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchGender = !filters.gender || p.gender === filters.gender
    const matchInsurance = !filters.insurance_type || p.insurance_type === filters.insurance_type
    const matchCity = !filters.city || p.city?.toLowerCase().includes(filters.city.toLowerCase())
    const matchState = !filters.state || p.state === filters.state
    return matchSearch && matchGender && matchInsurance && matchCity && matchState
  })

  const exportXLSX = () => {
    const colMap: Record<string, { label: string; fn: (p: any) => string }> = {
      full_name: { label: 'Nome', fn: (p) => p.full_name || '' },
      cpf: { label: 'CPF', fn: (p) => p.cpf || '' },
      phone: { label: 'Telefone', fn: (p) => p.phone || '' },
      email: { label: 'E-mail', fn: (p) => p.email || '' },
      gender: { label: 'Gênero', fn: (p) => GENDER_LABELS[p.gender] || '' },
      age: { label: 'Idade', fn: (p) => p.date_of_birth ? `${calculateAge(p.date_of_birth)}` : '' },
      insurance_type: { label: 'Convênio', fn: (p) => INSURANCE_LABELS[p.insurance_type] || '' },
      city: { label: 'Cidade', fn: (p) => p.city || '' },
      state: { label: 'Estado', fn: (p) => p.state || '' },
      created_at: { label: 'Cadastro', fn: (p) => p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '' },
    }
    const cols = selectedCols.map((k) => colMap[k]).filter(Boolean)
    const data = filteredPatients.map((p) => {
      const row: Record<string, string> = {}
      cols.forEach((c) => { row[c.label] = c.fn(p) })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes')
    ws['!cols'] = cols.map(() => ({ wch: 20 }))
    XLSX.writeFile(wb, `pacientes_${new Date().toISOString().split('T')[0]}.xlsx`)
    setShowExport(false)
    setToast({ message: 'Exportação concluída', type: 'success' })
  }

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

  return (
    <DashboardLayout>
      <PageHeader
        title="Pacientes"
        subtitle="Gerencie todos os pacientes"
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

      {networkError && (
        <Toast message={networkError.message} type="error" onClose={() => clearError()} />
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCardSkeleton count={3} />
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total de Pacientes" value={patients.length} icon={Users} color="bg-blue-500" loading={loading} />
            <StatCard label="Particulares" value={patients.filter(p => p.insurance_type === 'particular').length} icon={Users} color="bg-yellow-500" loading={loading} />
            <StatCard label="Com Convênio/SUS" value={patients.filter(p => p.insurance_type !== 'particular').length} icon={Users} color="bg-green-500" loading={loading} />
          </div>

          <div className="mb-4">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, CPF ou e-mail..." />
          </div>

          {/* Filtros avançados */}
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos os gêneros</option>
                {Object.entries(GENDER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={filters.insurance_type} onChange={(e) => setFilters({ ...filters, insurance_type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos os convênios</option>
                {Object.entries(INSURANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input placeholder="Cidade" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos os estados</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            {(filters.gender || filters.insurance_type || filters.city || filters.state) && (
              <button onClick={() => setFilters({ gender: '', insurance_type: '', city: '', state: '' })} className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline">Limpar filtros</button>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{filteredPatients.length} de {patients.length} pacientes</p>
            <button onClick={() => setShowExport(true)} className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm font-medium">
              <FileDown className="w-4 h-4" /> Exportar XLSX
            </button>
          </div>

          <DataTable columns={columns} data={filteredPatients} loading={loading} emptyMessage="Nenhum paciente encontrado" highlightOnHover />
        </>
      )}

      {/* Modal Export */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Exportar Pacientes">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecione as colunas para exportar:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'full_name', label: 'Nome' },
              { key: 'cpf', label: 'CPF' },
              { key: 'phone', label: 'Telefone' },
              { key: 'email', label: 'E-mail' },
              { key: 'gender', label: 'Gênero' },
              { key: 'age', label: 'Idade' },
              { key: 'insurance_type', label: 'Convênio' },
              { key: 'city', label: 'Cidade' },
              { key: 'state', label: 'Estado' },
              { key: 'created_at', label: 'Cadastro' },
            ].map((col) => (
              <label key={col.key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedCols.includes(col.key)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedCols([...selectedCols, col.key])
                    else setSelectedCols(selectedCols.filter((c) => c !== col.key))
                  }}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={exportXLSX} disabled={selectedCols.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Exportar
            </button>
            <button onClick={() => setShowExport(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
          </div>
        </div>
      </Modal>

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
