'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Trash2, UserCog } from 'lucide-react'
import { PageHeader, StatCard, Modal, Toast, DataTable, Badge } from '@/components/ui'
import { addClinicStaff, removeClinicStaff } from '@/app/actions'

export default function ClinicStaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [staffData, setStaffData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obter clínicas do staff logado
    const { data: userClinics } = await supabase
      .from('clinic_staff')
      .select('clinic_id')
      .eq('user_id', user.id)

    const clinicIds = userClinics?.map((c: any) => c.clinic_id) || []

    // 3 queries em paralelo
    const [allStaffRes, userClinicsRes, staffUsersRes] = await Promise.all([
      supabase
        .from('clinic_staff')
        .select('*, profiles(full_name, email, role), clinics(name)')
        .in('clinic_id', clinicIds.length > 0 ? clinicIds : ['00000000-0000-0000-0000-000000000000']),
      supabase
        .from('clinics')
        .select('id, name')
        .in('id', clinicIds.length > 0 ? clinicIds : ['00000000-0000-0000-0000-000000000000']),
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'staff'),
    ])

    setStaff(allStaffRes.data || [])
    setClinics(userClinicsRes.data || [])
    setAvailableUsers(staffUsersRes.data || [])
    setLoading(false)
  }

  const handleAdd = () => {
    setStaffData({ role_in_clinic: 'staff' })
    setFormError('')
    setShowModal(true)
  }

  const handleRemove = async (staffMember: any) => {
    if (!confirm(`Remover "${staffMember.profiles?.full_name}" da equipe?`)) return

    const result = await removeClinicStaff(staffMember.id)
    if (result.success) {
      setToast({ message: 'Membro removido da equipe', type: 'success' })
      loadData()
    } else {
      setToast({ message: result.error || 'Erro ao remover membro', type: 'error' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const result = await addClinicStaff(staffData)
    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao adicionar membro')
      return
    }

    setToast({ message: 'Membro adicionado à equipe', type: 'success' })
    setShowModal(false)
    setStaffData({})
    loadData()
  }

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (row: any) => <span className="font-medium text-gray-800">{row.profiles?.full_name || 'N/A'}</span>,
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (row: any) => row.profiles?.email || '—',
    },
    {
      key: 'clinic',
      label: 'Clínica',
      render: (row: any) => row.clinics?.name || '—',
    },
    {
      key: 'role',
      label: 'Função',
      render: (row: any) => <Badge status={row.role_in_clinic === 'manager' ? 'confirmed' : 'scheduled'} />,
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (row: any) => (
        <button
          onClick={() => handleRemove(row)}
          className="text-red-600 hover:text-red-800"
          title="Remover"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Equipe"
        subtitle="Gerencie a equipe da sua clínica"
        action={
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Adicionar Membro
          </button>
        }
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total da Equipe" value={staff.length} icon={Users} color="bg-blue-500" loading={loading} />
        <StatCard label="Gerentes" value={staff.filter(s => s.role_in_clinic === 'manager').length} icon={UserCog} color="bg-purple-500" loading={loading} />
        <StatCard label="Staff" value={staff.filter(s => s.role_in_clinic === 'staff').length} icon={Users} color="bg-green-500" loading={loading} />
      </div>

      <DataTable columns={columns} data={staff} loading={loading} emptyMessage="Nenhum membro na equipe" />

      {/* Modal Adicionar Membro */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Adicionar Membro à Equipe"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Toast message={formError} type="error" onClose={() => setFormError('')} />
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Clínica *</label>
            <select
              value={staffData.clinic_id || ''}
              onChange={(e) => setStaffData({ ...staffData, clinic_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecionar clínica</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Usuário (Staff) *</label>
            <select
              value={staffData.user_id || ''}
              onChange={(e) => setStaffData({ ...staffData, user_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecionar usuário</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Função</label>
            <select
              value={staffData.role_in_clinic || 'staff'}
              onChange={(e) => setStaffData({ ...staffData, role_in_clinic: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="staff">Staff</option>
              <option value="manager">Gerente</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adicionando...' : 'Adicionar'}
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
