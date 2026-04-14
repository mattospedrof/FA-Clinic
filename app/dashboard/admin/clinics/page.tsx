'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, Edit, Trash2, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader, StatCard, DataTable, Badge, Modal, Toast, StatCardSkeleton, TableSkeleton } from '@/components/ui'
import { createClinic, updateClinic, deleteClinic } from '@/app/actions'
import { fetchCep } from '@/lib/utils'
import { useNetworkError } from '@/hooks/useNetworkError'

export default function AdminClinicsPage() {
  const router = useRouter()
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClinic, setEditingClinic] = useState<any>(null)
  const [clinicData, setClinicData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const { error: networkError, handleError, clearError } = useNetworkError()
  const supabase = createClient()

  useEffect(() => { loadClinics() }, [])

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase.from('clinics').select('*').order('created_at', { ascending: false })
      if (error) {
        handleError(error)
        return
      }
      if (!error) setClinics(data || [])
    } catch (err: any) {
      handleError(err)
    }
    setLoading(false)
  }

  const handleCepBlur = async () => {
    if (clinicData.cep?.length === 8) {
      const data = await fetchCep(clinicData.cep)
      if (data) {
        setClinicData({ ...clinicData, address: data.logradouro, city: data.localidade, state: data.uf })
      }
    }
  }

  const handleNew = () => {
    setEditingClinic(null)
    setClinicData({})
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = (clinic: any) => {
    setEditingClinic(clinic)
    setClinicData(clinic)
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (clinic: any) => {
    if (!confirm(`Tem certeza que deseja excluir a clínica "${clinic.name}"?`)) return

    const result = await deleteClinic(clinic.id)
    if (result.success) {
      setToast({ message: 'Clínica excluída com sucesso', type: 'success' })
      loadClinics()
    } else {
      setToast({ message: result.error || 'Erro ao excluir clínica', type: 'error' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const action = editingClinic
      ? updateClinic(editingClinic.id, clinicData)
      : createClinic(clinicData)

    const result = await action
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao salvar clínica')
      return
    }

    setToast({ message: editingClinic ? 'Clínica atualizada com sucesso' : 'Clínica criada com sucesso', type: 'success' })
    setShowModal(false)
    setClinicData({})
    setEditingClinic(null)
    loadClinics()
  }

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'cnpj', label: 'CNPJ' },
    {
      key: 'location',
      label: 'Localização',
      render: (row: any) => row.city && row.state ? `${row.city}/${row.state}` : '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: any) => <Badge status={row.is_active ? 'true' : 'false'} />,
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
        title="Clínicas"
        subtitle="Gerencie todas as clínicas do sistema"
        action={
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Nova Clínica
          </button>
        }
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {networkError && (
        <Toast message={networkError.message} type="error" onClose={() => clearError()} />
      )}

      {loading ? (
        <>
          <StatCardSkeleton count={3} />
          <TableSkeleton rows={5} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total de Clínicas"
          value={clinics.length}
          icon={Building2}
          color="bg-blue-500"
          loading={loading}
        />
        <StatCard
          label="Clínicas Ativas"
          value={clinics.filter(c => c.is_active).length}
          icon={Building2}
          color="bg-green-500"
          loading={loading}
        />
        <StatCard
          label="Clínicas Inativas"
          value={clinics.filter(c => !c.is_active).length}
          icon={Building2}
          color="bg-red-500"
          loading={loading}
        />
      </div>

      <DataTable
        columns={columns}
        data={clinics}
        loading={loading}
        emptyMessage="Nenhuma clínica cadastrada"
        onRowClick={(row) => router.push(`/dashboard/admin/clinics/${row.id}`)}
      />
        </>
      )}

      {/* Modal de Criar/Editar */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingClinic ? 'Editar Clínica' : 'Nova Clínica'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Toast message={formError} type="error" onClose={() => setFormError('')} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Nome *</label>
              <input
                value={clinicData.name || ''}
                onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">CNPJ</label>
              <input
                value={clinicData.cnpj || ''}
                onChange={(e) => setClinicData({ ...clinicData, cnpj: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Telefone</label>
              <input
                value={clinicData.phone || ''}
                onChange={(e) => setClinicData({ ...clinicData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={clinicData.email || ''}
                onChange={(e) => setClinicData({ ...clinicData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">CEP</label>
              <input
                value={clinicData.cep || ''}
                onChange={(e) => setClinicData({ ...clinicData, cep: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                onBlur={handleCepBlur}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Endereço</label>
              <input
                value={clinicData.address || ''}
                onChange={(e) => setClinicData({ ...clinicData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Número</label>
              <input
                value={clinicData.address_number || ''}
                onChange={(e) => setClinicData({ ...clinicData, address_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Complemento</label>
              <input
                value={clinicData.address_complement || ''}
                onChange={(e) => setClinicData({ ...clinicData, address_complement: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Cidade</label>
              <input
                value={clinicData.city || ''}
                onChange={(e) => setClinicData({ ...clinicData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <input
                value={clinicData.state || ''}
                onChange={(e) => setClinicData({ ...clinicData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Horário Início</label>
              <input
                type="time"
                value={clinicData.opening_time || '08:00'}
                onChange={(e) => setClinicData({ ...clinicData, opening_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Horário Fim</label>
              <input
                type="time"
                value={clinicData.closing_time || '18:00'}
                onChange={(e) => setClinicData({ ...clinicData, closing_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Duração Consulta (min)</label>
              <input
                type="number"
                value={clinicData.consultation_duration_min || 30}
                onChange={(e) => setClinicData({ ...clinicData, consultation_duration_min: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Ticket Médio (R$)</label>
              <input
                type="number"
                step="0.01"
                value={clinicData.avg_ticket || 40}
                onChange={(e) => setClinicData({ ...clinicData, avg_ticket: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={clinicData.is_active !== false}
                onChange={(e) => setClinicData({ ...clinicData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Clínica ativa</label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Salvando...' : editingClinic ? 'Atualizar' : 'Criar Clínica'}
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
