'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { UserCog, Plus, Shield, Filter, FileDown, Edit, Trash2 } from 'lucide-react'
import { PageHeader, StatCard, DataTable, Badge, Modal, Toast } from '@/components/ui'
import { SearchInput } from '@/components/ui'
import { updateUser, deleteUser } from '@/app/actions'
import * as XLSX from 'xlsx'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  clinic: 'Clínica',
  doctor: 'Médico',
  staff: 'Staff',
  patient: 'Paciente',
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  clinic: '#f59e0b',
  doctor: '#3b82f6',
  staff: '#10b981',
  patient: '#8b5cf6',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ role: '' })
  const [showExport, setShowExport] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(['full_name', 'email', 'role', 'cpf', 'created_at'])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editData, setEditData] = useState<any>({})
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadUsers(); }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setUsers(data || [])
    setLoading(false)
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setEditData({ full_name: user.full_name || '', role: user.role || '', phone: user.phone || '', cpf: user.cpf || '' })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSubmitting(true)
    const result = await updateUser(editingUser.id, editData)
    setEditSubmitting(false)
    if (!result.success) {
      setToast({ message: result.error || 'Erro ao atualizar usuário', type: 'error' })
      return
    }
    setToast({ message: 'Usuário atualizado com sucesso', type: 'success' })
    setShowEditModal(false)
    setEditingUser(null)
    loadUsers()
  }

  const handleDelete = async (user: any) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.full_name || user.email}"? Esta ação não pode ser desfeita.`)) return
    const result = await deleteUser(user.id)
    if (result.success) {
      setToast({ message: 'Usuário excluído com sucesso', type: 'success' })
      loadUsers()
    } else {
      setToast({ message: result.error || 'Erro ao excluir usuário', type: 'error' })
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = !filters.role || u.role === filters.role
    return matchSearch && matchRole
  })

  const exportXLSX = () => {
    const colMap: Record<string, { label: string; fn: (u: any) => string }> = {
      full_name: { label: 'Nome', fn: (u) => u.full_name || u.email || '' },
      email: { label: 'E-mail', fn: (u) => u.email || '' },
      functionally: { label: 'Função', fn: (u) => ROLE_LABELS[u.role] || u.role },
      cpf: { label: 'CPF', fn: (u) => u.cpf || '' },
      phone: { label: 'Telefone', fn: (u) => u.phone || '' },
      created_at: { label: 'Criado em', fn: (u) => u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '' },
    }
    const cols = selectedCols.map((k) => colMap[k]).filter(Boolean)
    const data = filteredUsers.map((u) => {
      const row: Record<string, string> = {}
      cols.forEach((c) => { row[c.label] = c.fn(u) })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Usuários')
    ws['!cols'] = cols.map(() => ({ wch: 20 }))
    XLSX.writeFile(wb, `usuarios_${new Date().toISOString().split('T')[0]}.xlsx`)
    setShowExport(false)
    setToast({ message: 'Exportação concluída', type: 'success' })
  }

  const columns = [
    {
      key: 'full_name',
      label: 'Nome',
      render: (row: any) => <span className="font-medium text-gray-800">{row.full_name || row.email}</span>,
    },
    {
      key: 'email',
      label: 'E-mail',
    },
    {
      key: 'role',
      label: 'Função',
      render: (row: any) => (
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: (ROLE_COLORS[row.role] || '#6b7280') + '20', color: ROLE_COLORS[row.role] || '#6b7280' }}
        >
          {ROLE_LABELS[row.role] || row.role}
        </span>
      ),
    },
    {
      key: 'cpf',
      label: 'CPF',
      render: (row: any) => row.cpf || '—',
    },
    {
      key: 'phone',
      label: 'Telefone',
      render: (row: any) => row.phone || '—',
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (row: any) => row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '—',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (row: any) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(row) }} className="text-blue-600 hover:text-blue-800" title="Editar">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(row) }} className="text-red-600 hover:text-red-800" title="Excluir">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie todos os usuários do sistema"
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total de Usuários" value={users.length} icon={UserCog} color="bg-blue-500" loading={loading} />
        <StatCard label="Admins" value={users.filter(u => u.role === 'admin').length} icon={Shield} color="bg-red-500" loading={loading} />
        <StatCard label="Médicos" value={users.filter(u => u.role === 'doctor').length} icon={UserCog} color="bg-green-500" loading={loading} />
        <StatCard label="Pacientes" value={users.filter(u => u.role === 'patient').length} icon={UserCog} color="bg-purple-500" loading={loading} />
      </div>

      <div className="mb-4">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, e-mail ou role..." />
      </div>

      {/* Filtros + Export */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filters.role} onChange={(e) => setFilters({ role: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos as opções</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {filters.role && (
            <button onClick={() => setFilters({ role: '' })} className="text-sm text-gray-500 hover:text-gray-700 underline">Limpar</button>
          )}
        </div>
        <div className="flex-1" />
        <p className="text-sm text-gray-500">{filteredUsers.length} de {users.length} usuários</p>
        <button onClick={() => setShowExport(true)} className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm font-medium">
          <FileDown className="w-4 h-4" /> Exportar XLSX
        </button>
      </div>

      <DataTable columns={columns} data={filteredUsers} loading={loading} emptyMessage="Nenhum usuário encontrado" highlightOnHover />

      {/* Modal Export */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Exportar Usuários">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecione as colunas para exportar:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'full_name', label: 'Nome' },
              { key: 'email', label: 'E-mail' },
              { key: 'role', label: 'Role' },
              { key: 'cpf', label: 'CPF' },
              { key: 'phone', label: 'Telefone' },
              { key: 'created_at', label: 'Criado em' },
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

      {/* Modal Editar Usuário */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Usuário">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome</label>
            <input value={editData.full_name || ''} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select value={editData.role || ''} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">CPF</label>
            <input value={editData.cpf || ''} onChange={(e) => setEditData({ ...editData, cpf: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Telefone</label>
            <input value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={editSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {editSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowEditModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
