'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Settings, Clock, MapPin, CheckCircle, XCircle, Plus, Edit, Save } from 'lucide-react'
import { PageHeader, StatCard, Modal, Toast } from '@/components/ui'

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

export default function DoctorAvailabilityPage() {
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [editingClinic, setEditingClinic] = useState<any>(null)
  const [editData, setEditData] = useState<any>({})
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: dc } = await supabase
      .from('doctor_clinics')
      .select('*, clinics(name, city, state, opening_time, closing_time)')
      .eq('doctor_id', user.id)

    setClinics(dc || [])
    setLoading(false)
  }

  const handleEdit = (clinic: any) => {
    setEditingClinic(clinic)
    setEditData({
      available_days: clinic.available_days || [1, 2, 3, 4, 5],
      available_start: clinic.available_start || '08:00',
      available_end: clinic.available_end || '18:00',
      is_available: clinic.is_available ?? true,
      specialty: clinic.specialty || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !editingClinic) return

    const { error } = await supabase
      .from('doctor_clinics')
      .update({
        available_days: editData.available_days,
        available_start: editData.available_start,
        available_end: editData.available_end,
        is_available: editData.is_available,
        specialty: editData.specialty,
      })
      .eq('id', editingClinic.id)

    if (error) {
      setToast({ message: 'Erro ao salvar disponibilidade', type: 'error' })
      return
    }

    setToast({ message: 'Disponibilidade atualizada com sucesso', type: 'success' })
    setShowModal(false)
    setEditingClinic(null)
    loadData()
  }

  const toggleDay = (day: number) => {
    const current = editData.available_days || []
    const updated = current.includes(day)
      ? current.filter((d: number) => d !== day)
      : [...current, day]
    setEditData({ ...editData, available_days: updated })
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Minha Disponibilidade"
        subtitle="Gerencie seus horários e dias de atendimento"
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-8">Carregando...</p>
      ) : clinics.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-center py-8">Nenhuma clínica vinculada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {clinics.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{c.clinics?.name}</h3>
                    <p className="text-sm text-gray-500">{c.clinics?.city}/{c.clinics?.state}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(c)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Funcionamento da Clínica</p>
                    <p className="text-sm font-medium text-gray-800">
                      {c.clinics?.opening_time} - {c.clinics?.closing_time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Sua Disponibilidade</p>
                    <p className="text-sm font-medium text-gray-800">
                      {c.available_start} - {c.available_end}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {c.is_available ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`text-sm font-medium ${c.is_available ? 'text-green-700' : 'text-red-700'}`}>
                      {c.is_available ? 'Disponível' : 'Indisponível'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Dias disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DAY_LABELS).map(([day, label]) => {
                    const isActive = c.available_days?.includes(parseInt(day))
                    return (
                      <span
                        key={day}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {c.specialty && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Especialidade:</span> {c.specialty}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Editar Disponibilidade"
      >
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Especialidade</label>
            <input
              value={editData.specialty || ''}
              onChange={(e) => setEditData({ ...editData, specialty: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Cardiologia, Dermatologia..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Dias da Semana</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DAY_LABELS).map(([day, label]) => {
                const isActive = editData.available_days?.includes(parseInt(day))
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(parseInt(day))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Horário Início</label>
              <input
                type="time"
                value={editData.available_start || '08:00'}
                onChange={(e) => setEditData({ ...editData, available_start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Horário Fim</label>
              <input
                type="time"
                value={editData.available_end || '18:00'}
                onChange={(e) => setEditData({ ...editData, available_end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_available"
              checked={editData.is_available}
              onChange={(e) => setEditData({ ...editData, is_available: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_available" className="text-sm font-medium text-gray-700">
              Estou disponível para agendamentos
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
