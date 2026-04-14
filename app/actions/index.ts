'use server'

import { createClient } from '@/lib/supabase/server'
import { validateCpf } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ============================================
// TYPES
// ============================================

type ActionResult<T = any> = {
  success: boolean
  data?: T
  error?: string
}

type PatientInput = {
  full_name: string
  date_of_birth: string
  gender: string
  cpf?: string
  email?: string
  phone: string
  cep?: string
  address?: string
  address_number?: string
  address_complement?: string
  city?: string
  state?: string
  insurance_type: 'particular' | 'convenio' | 'sus'
  insurance_name?: string
  insurance_number?: string
  cnis?: string
}

type AppointmentInput = {
  clinic_id: string
  doctor_id: string
  patient_id: string
  date: string
  start_time: string
  type?: 'consultation' | 'exam'
  notes?: string
}

type MedicalRecordInput = {
  appointment_id: string
  clinic_id: string
  patient_id: string
  diagnosis?: string
  evolution?: string
  notes?: string
  prescription?: string
}

type MedicalRecordUpdateInput = {
  id: string
  diagnosis?: string
  evolution?: string
  notes?: string
  prescription?: string
}

type ClinicInput = {
  name: string
  cnpj?: string
  phone?: string
  email?: string
  cep?: string
  address?: string
  address_number?: string
  address_complement?: string
  city?: string
  state?: string
  opening_time?: string
  closing_time?: string
  lunch_start?: string
  lunch_end?: string
  consultation_duration_min?: number
  avg_ticket?: number
  is_active?: boolean
}

type StaffInput = {
  clinic_id: string
  user_id: string
  role_in_clinic?: string
}

// ============================================
// HELPERS
// ============================================

function sanitizeString(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value.trim().replace(/<[^>]*>/g, '').slice(0, 1000)
}

function validateEmail(email: string | undefined): boolean {
  if (!email) return true // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function requireRole(roles: string[]): Promise<{ userId: string; role: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !roles.includes(profile.role)) {
    throw new Error('Acesso não autorizado')
  }

  return { userId: user.id, role: profile.role }
}

// ============================================
// PATIENTS
// ============================================

export async function createPatient(input: PatientInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { role } = await requireRole(['admin', 'staff'])

    // Validações
    if (!input.full_name || input.full_name.trim().length < 3) {
      return { success: false, error: 'Nome completo é obrigatório (mínimo 3 caracteres)' }
    }
    if (!input.date_of_birth) {
      return { success: false, error: 'Data de nascimento é obrigatória' }
    }
    if (!input.gender) {
      return { success: false, error: 'Gênero é obrigatório' }
    }
    if (!input.phone) {
      return { success: false, error: 'Telefone é obrigatório' }
    }
    if (input.cpf && !validateCpf(input.cpf)) {
      return { success: false, error: 'CPF inválido' }
    }
    if (input.email && !validateEmail(input.email)) {
      return { success: false, error: 'Email inválido' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from('patients').insert([{
      full_name: sanitizeString(input.full_name)!,
      date_of_birth: input.date_of_birth,
      gender: input.gender,
      cpf: input.cpf || null,
      email: sanitizeString(input.email) || null,
      phone: sanitizeString(input.phone)!,
      cep: input.cep || null,
      address: sanitizeString(input.address) || null,
      address_number: sanitizeString(input.address_number) || null,
      address_complement: sanitizeString(input.address_complement) || null,
      city: sanitizeString(input.city) || null,
      state: sanitizeString(input.state) || null,
      insurance_type: input.insurance_type,
      insurance_name: sanitizeString(input.insurance_name) || null,
      insurance_number: sanitizeString(input.insurance_number) || null,
      cnis: sanitizeString(input.cnis) || null,
    }]).select().single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'CPF já cadastrado' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/staff')
    return { success: true, data: { id: data.id } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updatePatient(id: string, input: Partial<PatientInput>): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin', 'staff'])

    if (input.cpf && !validateCpf(input.cpf)) {
      return { success: false, error: 'CPF inválido' }
    }
    if (input.email && !validateEmail(input.email)) {
      return { success: false, error: 'Email inválido' }
    }

    const supabase = await createClient()

    const updateData: any = {}
    if (input.full_name !== undefined) updateData.full_name = sanitizeString(input.full_name)
    if (input.date_of_birth !== undefined) updateData.date_of_birth = input.date_of_birth
    if (input.gender !== undefined) updateData.gender = input.gender
    if (input.cpf !== undefined) updateData.cpf = input.cpf || null
    if (input.email !== undefined) updateData.email = sanitizeString(input.email) || null
    if (input.phone !== undefined) updateData.phone = sanitizeString(input.phone)
    if (input.cep !== undefined) updateData.cep = input.cep || null
    if (input.address !== undefined) updateData.address = sanitizeString(input.address) || null
    if (input.address_number !== undefined) updateData.address_number = sanitizeString(input.address_number) || null
    if (input.address_complement !== undefined) updateData.address_complement = sanitizeString(input.address_complement) || null
    if (input.city !== undefined) updateData.city = sanitizeString(input.city) || null
    if (input.state !== undefined) updateData.state = sanitizeString(input.state) || null
    if (input.insurance_type !== undefined) updateData.insurance_type = input.insurance_type
    if (input.insurance_name !== undefined) updateData.insurance_name = sanitizeString(input.insurance_name) || null
    if (input.insurance_number !== undefined) updateData.insurance_number = sanitizeString(input.insurance_number) || null
    if (input.cnis !== undefined) updateData.cnis = sanitizeString(input.cnis) || null

    const { error } = await supabase.from('patients').update(updateData).eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'CPF já cadastrado' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/staff')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// APPOINTMENTS
// ============================================

export async function createAppointment(input: AppointmentInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, role } = await requireRole(['admin', 'staff', 'doctor'])

    // Validações
    if (!input.clinic_id || !input.doctor_id || !input.patient_id) {
      return { success: false, error: 'Clínica, médico e paciente são obrigatórios' }
    }
    if (!input.date || !input.start_time) {
      return { success: false, error: 'Data e horário são obrigatórios' }
    }

    const supabase = await createClient()

    // Verificar se já existe agendamento no mesmo horário
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', input.doctor_id)
      .eq('date', input.date)
      .eq('start_time', input.start_time)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (conflict) {
      return { success: false, error: 'Já existe um agendamento neste horário para este médico' }
    }

    const { data, error } = await supabase.from('appointments').insert([{
      clinic_id: input.clinic_id,
      doctor_id: input.doctor_id,
      patient_id: input.patient_id,
      date: input.date,
      start_time: input.start_time,
      type: input.type || 'consultation',
      status: 'scheduled',
      notes: sanitizeString(input.notes) || null,
    }]).select().single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Vincular paciente à clínica se ainda não estiver
    await supabase.from('clinic_patients').insert({
      clinic_id: input.clinic_id,
      patient_id: input.patient_id,
    }).select().maybeSingle()

    // Vincular médico à clínica se ainda não estiver
    // Buscar specialty e crm do médico de outro vínculo existente
    const { data: existingLink } = await supabase
      .from('doctor_clinics')
      .select('specialty, crm')
      .eq('doctor_id', input.doctor_id)
      .maybeSingle()

    if (existingLink) {
      await supabase.from('doctor_clinics').insert({
        clinic_id: input.clinic_id,
        doctor_id: input.doctor_id,
        specialty: existingLink.specialty,
        crm: existingLink.crm,
        is_available: true,
      }).select().maybeSingle()
    }

    revalidatePath('/dashboard/staff')
    revalidatePath('/dashboard/doctor')
    return { success: true, data: { id: data.id } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateAppointmentStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const { userId, role } = await requireRole(['admin', 'staff', 'doctor'])

    const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show']
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Status inválido' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/staff')
    revalidatePath('/dashboard/doctor')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// MEDICAL RECORDS
// ============================================

export async function createMedicalRecord(input: MedicalRecordInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, role } = await requireRole(['admin', 'doctor'])

    if (!input.appointment_id || !input.clinic_id || !input.patient_id) {
      return { success: false, error: 'Consulta, clínica e paciente são obrigatórios' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from('medical_records').insert([{
      appointment_id: input.appointment_id,
      clinic_id: input.clinic_id,
      doctor_id: userId,
      patient_id: input.patient_id,
      diagnosis: sanitizeString(input.diagnosis) || null,
      evolution: sanitizeString(input.evolution) || null,
      notes: sanitizeString(input.notes) || null,
    }]).select().single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Criar receita se fornecida
    if (input.prescription) {
      await supabase.from('prescriptions').insert([{
        medical_record_id: data.id,
        clinic_id: input.clinic_id,
        doctor_id: userId,
        patient_id: input.patient_id,
        content: sanitizeString(input.prescription)!,
      }])
    }

    revalidatePath('/dashboard/doctor')
    return { success: true, data: { id: data.id } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// CLINICS
// ============================================

export async function createClinic(input: ClinicInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { role } = await requireRole(['admin'])

    if (!input.name || input.name.trim().length < 3) {
      return { success: false, error: 'Nome da clínica é obrigatório (mínimo 3 caracteres)' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from('clinics').insert([{
      name: sanitizeString(input.name)!,
      cnpj: input.cnpj || null,
      phone: input.phone || null,
      email: input.email || null,
      cep: input.cep || null,
      address: sanitizeString(input.address) || null,
      address_number: sanitizeString(input.address_number) || null,
      address_complement: sanitizeString(input.address_complement) || null,
      city: sanitizeString(input.city) || null,
      state: sanitizeString(input.state) || null,
      opening_time: input.opening_time || '08:00',
      closing_time: input.closing_time || '18:00',
      lunch_start: input.lunch_start || null,
      lunch_end: input.lunch_end || null,
      consultation_duration_min: input.consultation_duration_min || 30,
      avg_ticket: input.avg_ticket || 40.00,
      is_active: input.is_active !== undefined ? input.is_active : true,
    }]).select().single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'CNPJ já cadastrado' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/admin/clinics')
    return { success: true, data: { id: data.id } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateClinic(id: string, input: Partial<ClinicInput>): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin'])

    const supabase = await createClient()

    const updateData: any = {}
    if (input.name !== undefined) updateData.name = sanitizeString(input.name)
    if (input.cnpj !== undefined) updateData.cnpj = input.cnpj || null
    if (input.phone !== undefined) updateData.phone = input.phone || null
    if (input.email !== undefined) updateData.email = sanitizeString(input.email) || null
    if (input.cep !== undefined) updateData.cep = input.cep || null
    if (input.address !== undefined) updateData.address = sanitizeString(input.address) || null
    if (input.address_number !== undefined) updateData.address_number = sanitizeString(input.address_number) || null
    if (input.address_complement !== undefined) updateData.address_complement = sanitizeString(input.address_complement) || null
    if (input.city !== undefined) updateData.city = sanitizeString(input.city) || null
    if (input.state !== undefined) updateData.state = sanitizeString(input.state) || null
    if (input.opening_time !== undefined) updateData.opening_time = input.opening_time
    if (input.closing_time !== undefined) updateData.closing_time = input.closing_time
    if (input.lunch_start !== undefined) updateData.lunch_start = input.lunch_start || null
    if (input.lunch_end !== undefined) updateData.lunch_end = input.lunch_end || null
    if (input.consultation_duration_min !== undefined) updateData.consultation_duration_min = input.consultation_duration_min
    if (input.avg_ticket !== undefined) updateData.avg_ticket = input.avg_ticket
    if (input.is_active !== undefined) updateData.is_active = input.is_active

    const { error } = await supabase.from('clinics').update(updateData).eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'CNPJ já cadastrado' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/admin/clinics')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteClinic(id: string): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin'])

    const supabase = await createClient()
    const { error } = await supabase.from('clinics').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/admin/clinics')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// DELETE PATIENT
// ============================================

export async function deletePatient(id: string): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin', 'staff'])

    const supabase = await createClient()
    const { error } = await supabase.from('patients').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/staff')
    revalidatePath('/dashboard/staff/patients')
    revalidatePath('/dashboard/admin/patients')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// UPDATE MEDICAL RECORD
// ============================================

export async function updateMedicalRecord(id: string, input: { diagnosis?: string; evolution?: string; notes?: string; prescription?: string }): Promise<ActionResult> {
  try {
    const { userId } = await requireRole(['admin', 'doctor'])

    const supabase = await createClient()

    const updateData: any = {}
    if (input.diagnosis !== undefined) updateData.diagnosis = sanitizeString(input.diagnosis) || null
    if (input.evolution !== undefined) updateData.evolution = sanitizeString(input.evolution) || null
    if (input.notes !== undefined) updateData.notes = sanitizeString(input.notes) || null

    const { error } = await supabase.from('medical_records').update(updateData).eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    // Atualizar receita existente ou criar nova
    if (input.prescription !== undefined) {
      const { data: existingRx } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('medical_record_id', id)
        .maybeSingle()

      if (existingRx) {
        await supabase.from('prescriptions').update({ content: sanitizeString(input.prescription) || '' }).eq('id', existingRx.id)
      } else if (input.prescription) {
        const { data: record } = await supabase.from('medical_records').select('*').eq('id', id).single()
        if (record) {
          await supabase.from('prescriptions').insert([{
            medical_record_id: id,
            clinic_id: record.clinic_id,
            doctor_id: record.doctor_id,
            patient_id: record.patient_id,
            content: sanitizeString(input.prescription)!,
          }])
        }
      }
    }

    revalidatePath('/dashboard/doctor')
    revalidatePath('/dashboard/doctor/records')
    revalidatePath('/dashboard/doctor/prescriptions')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// CLINIC STAFF
// ============================================

export async function addClinicStaff(input: StaffInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { role } = await requireRole(['admin', 'clinic'])

    if (!input.clinic_id || !input.user_id) {
      return { success: false, error: 'Clínica e usuário são obrigatórios' }
    }

    const supabase = await createClient()

    // Verificar se já é staff
    const { data: existing } = await supabase
      .from('clinic_staff')
      .select('id')
      .eq('clinic_id', input.clinic_id)
      .eq('user_id', input.user_id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Usuário já é membro da equipe desta clínica' }
    }

    const { data, error } = await supabase.from('clinic_staff').insert([{
      clinic_id: input.clinic_id,
      user_id: input.user_id,
      role_in_clinic: input.role_in_clinic || 'staff',
    }]).select().single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/clinic/staff')
    return { success: true, data: { id: data.id } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function removeClinicStaff(id: string): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin', 'clinic'])

    const supabase = await createClient()
    const { error } = await supabase.from('clinic_staff').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/clinic/staff')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ============================================
// USER MANAGEMENT (Admin only)
// ============================================

export async function updateUser(id: string, input: { full_name?: string; role?: string; phone?: string; cpf?: string }): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin'])

    const updateData: any = {}
    if (input.full_name !== undefined) updateData.full_name = sanitizeString(input.full_name)
    if (input.role !== undefined) updateData.role = input.role
    if (input.phone !== undefined) updateData.phone = sanitizeString(input.phone) || null
    if (input.cpf !== undefined) updateData.cpf = sanitizeString(input.cpf) || null

    const supabase = await createClient()
    const { error } = await supabase.from('profiles').update(updateData).eq('id', id)

    if (error) {
      if (error.code === '23505') return { success: false, error: 'CPF já cadastrado' }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin/users')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function removeDoctorFromClinic(clinicId: string, doctorId: string): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin'])
    const supabase = await createClient()

    const { error } = await supabase.from('doctor_clinics').delete().eq('clinic_id', clinicId).eq('doctor_id', doctorId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin/clinics')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function removePatientFromClinic(clinicId: string, patientId: string): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin', 'staff'])
    const supabase = await createClient()

    const { error } = await supabase.from('clinic_patients').delete().eq('clinic_id', clinicId).eq('patient_id', patientId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin/clinics')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const { role } = await requireRole(['admin'])
    const supabase = await createClient()

    // First delete related records
    await supabase.from('clinic_staff').delete().eq('user_id', id)
    await supabase.from('doctor_clinics').delete().eq('doctor_id', id)
    await supabase.from('appointments').delete().eq('doctor_id', id)
    await supabase.from('medical_records').delete().eq('doctor_id', id)
    await supabase.from('prescriptions').delete().eq('doctor_id', id)
    await supabase.from('notifications').delete().eq('user_id', id)

    // Delete profile (cascades to auth.users if configured)
    const { error } = await supabase.from('profiles').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/admin/users')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
