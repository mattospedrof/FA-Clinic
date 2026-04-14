'use client'

import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Users, ListOrdered, Plus, Search, MapPin } from 'lucide-react'
import { formatCpf, formatPhone, fetchCep, validateCpf } from '@/lib/utils'
import { createPatient } from '@/app/actions'

export default function StaffDashboard() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [patientData, setPatientData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const supabase = createClient()

  const load = async () => {
    const { data: appts } = await supabase.from('appointments').select('*, patients(full_name), clinics(name)').order('date', { ascending: true }).limit(50)
    const { data: pats } = await supabase.from('patients').select('*').limit(50)
    setAppointments(appts || [])
    setPatients(pats || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCepBlur = async () => {
    if (patientData.cep?.length === 8) {
      const data = await fetchCep(patientData.cep)
      if (data) {
        setPatientData({ ...patientData, address: data.logradouro, city: data.localidade, state: data.uf })
      }
    }
  }

  const handlePatientSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    const result = await createPatient({
      full_name: patientData.full_name,
      date_of_birth: patientData.date_of_birth,
      gender: patientData.gender,
      cpf: patientData.cpf,
      email: patientData.email,
      phone: patientData.phone,
      cep: patientData.cep,
      address: patientData.address,
      address_number: patientData.address_number,
      address_complement: patientData.address_complement,
      city: patientData.city,
      state: patientData.state,
      insurance_type: patientData.insurance_type || 'particular',
      insurance_name: patientData.insurance_name,
    })

    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Erro ao cadastrar paciente')
      return
    }

    setPatientData({})
    setShowPatientForm(false)
    load()
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Painel de Atendimento</h1>
        <p className="text-gray-500 mt-1">Agendamentos e pacientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <Calendar className="w-10 h-10 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Agendamentos Hoje</p>
            <p className="text-2xl font-bold text-gray-800">
              {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <Users className="w-10 h-10 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Total Pacientes</p>
            <p className="text-2xl font-bold text-gray-800">{patients.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <ListOrdered className="w-10 h-10 text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500">Fila de Espera</p>
            <p className="text-2xl font-bold text-gray-800">0</p>
          </div>
        </div>
      </div>

      {/* Patient form */}
      {showPatientForm && (
        <form onSubmit={handlePatientSubmit} className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Novo Paciente</h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Nome completo" value={patientData.full_name || ''} onChange={(e) => setPatientData({ ...patientData, full_name: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="date" value={patientData.date_of_birth || ''} onChange={(e) => setPatientData({ ...patientData, date_of_birth: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
            <select value={patientData.gender || ''} onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Gênero</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="NB">Não-binário</option>
              <option value="O">Outro</option>
              <option value="PNS">Prefiro não dizer</option>
            </select>
            <input placeholder="CPF" value={patientData.cpf || ''} onChange={(e) => setPatientData({ ...patientData, cpf: formatCpf(e.target.value) })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Telefone" value={patientData.phone || ''} onChange={(e) => setPatientData({ ...patientData, phone: formatPhone(e.target.value) })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="email" placeholder="E-mail" value={patientData.email || ''} onChange={(e) => setPatientData({ ...patientData, email: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="CEP" value={patientData.cep || ''} onChange={(e) => setPatientData({ ...patientData, cep: e.target.value.replace(/\D/g, '').slice(0, 8) })} onBlur={handleCepBlur} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Endereço" value={patientData.address || ''} onChange={(e) => setPatientData({ ...patientData, address: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Número" value={patientData.address_number || ''} onChange={(e) => setPatientData({ ...patientData, address_number: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Complemento" value={patientData.address_complement || ''} onChange={(e) => setPatientData({ ...patientData, address_complement: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Cidade" value={patientData.city || ''} onChange={(e) => setPatientData({ ...patientData, city: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Estado" value={patientData.state || ''} onChange={(e) => setPatientData({ ...patientData, state: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={patientData.insurance_type || 'particular'} onChange={(e) => setPatientData({ ...patientData, insurance_type: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="particular">Particular</option>
              <option value="convenio">Convênio</option>
              <option value="sus">SUS</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Cadastrando...' : 'Cadastrar'}
            </button>
            <button type="button" onClick={() => setShowPatientForm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">Cancelar</button>
          </div>
        </form>
      )}

      {/* Search + New Patient */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar paciente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setShowPatientForm(!showPatientForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          <Plus className="w-5 h-5" />
          Novo Paciente
        </button>
      </div>

      {/* Appointments table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Horário</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Clínica</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum agendamento</td></tr>
            ) : appointments.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{a.patients?.full_name || 'N/A'}</td>
                <td className="px-6 py-4 text-gray-600">{a.date}</td>
                <td className="px-6 py-4 text-gray-600">{a.start_time?.slice(0, 5)}</td>
                <td className="px-6 py-4 text-gray-600">{a.clinics?.name || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    a.status === 'completed' ? 'bg-green-100 text-green-800' :
                    a.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    a.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
