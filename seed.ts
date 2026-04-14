import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Service role key bypassa RLS e permite criar auth users
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================
// DADOS
// ============================================

const CLINICS = [
  { name: 'Clínica São Lucas', city: 'São Paulo', state: 'SP', opening_time: '08:00', closing_time: '18:00', consultation_duration_min: 30, avg_ticket: 150 },
  { name: 'Centro Médico Vida', city: 'Rio de Janeiro', state: 'RJ', opening_time: '07:00', closing_time: '19:00', consultation_duration_min: 20, avg_ticket: 120 },
  { name: 'PoliClínica Saúde', city: 'Belo Horizonte', state: 'MG', opening_time: '08:00', closing_time: '17:00', consultation_duration_min: 30, avg_ticket: 100 },
  { name: 'Hospital Dia Bem Estar', city: 'Curitiba', state: 'PR', opening_time: '09:00', closing_time: '20:00', consultation_duration_min: 25, avg_ticket: 180 },
  { name: 'Clínica Família', city: 'Porto Alegre', state: 'RS', opening_time: '08:00', closing_time: '18:00', consultation_duration_min: 30, avg_ticket: 110 },
  { name: 'Instituto de Medicina Integral', city: 'Recife', state: 'PE', opening_time: '07:30', closing_time: '19:30', consultation_duration_min: 20, avg_ticket: 90 },
  { name: 'Centro de Especialidades Médicas', city: 'Salvador', state: 'BA', opening_time: '08:00', closing_time: '17:00', consultation_duration_min: 30, avg_ticket: 95 },
  { name: 'Clínica Bem Viver', city: 'Fortaleza', state: 'CE', opening_time: '08:00', closing_time: '18:00', consultation_duration_min: 30, avg_ticket: 85 },
]

const DOCTORS = [
  { name: 'Carlos Mendes', specialty: 'Cardiologia', crm: 'CRM/SP 12345' },
  { name: 'Ana Silva', specialty: 'Dermatologia', crm: 'CRM/SP 23456' },
  { name: 'Roberto Costa', specialty: 'Ortopedia', crm: 'CRM/RJ 34567' },
  { name: 'Maria Oliveira', specialty: 'Pediatria', crm: 'CRM/RJ 45678' },
  { name: 'João Santos', specialty: 'Neurologia', crm: 'CRM/MG 56789' },
  { name: 'Fernanda Lima', specialty: 'Ginecologia', crm: 'CRM/MG 67890' },
  { name: 'Pedro Almeida', specialty: 'Clínica Geral', crm: 'CRM/PR 78901' },
  { name: 'Lucia Ferreira', specialty: 'Oftalmologia', crm: 'CRM/PR 89012' },
  { name: 'Marcos Ribeiro', specialty: 'Cardiologia', crm: 'CRM/RS 90123' },
  { name: 'Camila Souza', specialty: 'Endocrinologia', crm: 'CRM/RS 01234' },
  { name: 'Rafael Nunes', specialty: 'Urologia', crm: 'CRM/PE 11234' },
  { name: 'Patricia Rocha', specialty: 'Pneumologia', crm: 'CRM/PE 22345' },
  { name: 'Eduardo Dias', specialty: 'Gastroenterologia', crm: 'CRM/BA 33456' },
  { name: 'Juliana Martins', specialty: 'Reumatologia', crm: 'CRM/BA 44567' },
  { name: 'Thiago Barbosa', specialty: 'Oncologia', crm: 'CRM/CE 55678' },
  { name: 'Beatriz Araújo', specialty: 'Psiquiatria', crm: 'CRM/CE 66789' },
  { name: 'Lucas Pereira', specialty: 'Otorrinolaringologia', crm: 'CRM/SP 77890' },
  { name: 'Gabriela Moreira', specialty: 'Nutrologia', crm: 'CRM/RJ 88901' },
  { name: 'Felipe Cardoso', specialty: 'Angiologia', crm: 'CRM/MG 99012' },
  { name: 'Letícia Gomes', specialty: 'Infectologia', crm: 'CRM/PR 10123' },
]

const STAFF_NAMES = ['Joana Pereira', 'Ricardo Lima', 'Sandra Costa', 'Marcos Silva', 'Tatiane Santos', 'Paulo Oliveira', 'Renata Ferreira', 'Diego Almeida', 'Vanessa Rocha', 'Bruno Martins', 'Carla Nunes', 'André Barbosa']

const PATIENT_FIRST_NAMES = ['Lucas', 'Gabriela', 'Felipe', 'Letícia', 'Rafael', 'Amanda', 'Thiago', 'Camila', 'Bruno', 'Juliana', 'Diego', 'Patricia', 'Marcos', 'Fernanda', 'Pedro', 'Ana', 'Carlos', 'Maria', 'João', 'Lúcia', 'Roberto', 'Sandra', 'Ricardo', 'Tatiane', 'Paulo', 'Vanessa', 'André', 'Beatriz', 'Eduardo', 'Mariana', 'Henrique', 'Isabela', 'Gustavo', 'Larissa', 'Leonardo', 'Priscila', 'Daniel', 'Renata', 'Matheus', 'Aline', 'Victor', 'Carolina', 'Guilherme', 'Adriana', 'Alexandre', 'Simone', 'Fabio', 'Eliane', 'Rodrigo', 'Monica']
const PATIENT_LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Costa', 'Gomes', 'Martins', 'Lima', 'Pereira', 'Ribeiro', 'Nunes', 'Barbosa', 'Araújo', 'Carvalho', 'Melo', 'Rocha', 'Dias', 'Moreira', 'Cardoso', 'Machado', 'Monteiro', 'Castro', 'Vieira', 'Teixeira', 'Campos', 'Moura', 'Pinto']

const INSURANCE_TYPES = ['particular', 'convenio', 'sus'] as const
const INSURANCE_NAMES = ['Unimed', 'Bradesco Saúde', 'Amil', 'SulAmérica', 'Hapvida', 'NotreDame', 'Porto Seguro']
const GENDERS = ['M', 'F', 'NB'] as const
const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] as const
const APPT_TYPES = ['consultation', 'exam'] as const

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

function randomTime() {
  const h = randomInt(8, 17)
  const m = Math.random() > 0.5 ? 0 : 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function generatePhone() {
  return `(11) 9${String(randomInt(1000, 9999))}-${String(randomInt(1000, 9999))}`
}

function slugify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
}

async function createAuthUser(fullName: string, role: string): Promise<string | null> {
  const slug = slugify(fullName)
  const email = `${slug}${randomInt(1, 999)}@${role}.faclinic.com`
  const password = 'senha123!'

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (error) {
    console.error(`  ❌ Error creating auth user ${fullName}:`, error.message)
    return null
  }

  const userId = data.user.id

  // Cria o profile manualmente (sem depender do trigger)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: userId,
      full_name: fullName,
      email,
      role,
    }])

  if (profileError) {
    // Se já existe (trigger já criou), faz update do role
    if (profileError.code === '23505') {
      await supabase.from('profiles').update({ role }).eq('id', userId)
      return userId
    }
    console.error(`  ❌ Profile error ${fullName}:`, profileError.message, 'code:', profileError.code)
    return null
  }

  return userId
}

async function seed() {
  console.log('🌱 Starting seed...\n')

  const dateStart = new Date('2026-04-13')
  const dateEnd = new Date('2026-08-10')

  // ============================================
  // 1. CLINICS
  // ============================================
  console.log('📋 Creating clinics...')
  const clinicIds: string[] = []
  for (const c of CLINICS) {
    const { data, error } = await supabase.from('clinics').insert([{
      name: c.name, city: c.city, state: c.state,
      opening_time: c.opening_time, closing_time: c.closing_time,
      consultation_duration_min: c.consultation_duration_min,
      avg_ticket: c.avg_ticket, is_active: true,
    }]).select().single()
    if (error) console.error(`  ❌ ${c.name}:`, error.message)
    else { clinicIds.push(data.id); console.log(`  ✅ ${c.name}`) }
  }
  console.log(`  → ${clinicIds.length} clinics\n`)

  // ============================================
  // 2. DOCTORS (auth.users → profiles via trigger)
  // ============================================
  console.log('👨‍⚕️ Creating doctors...')
  const doctorIds: string[] = []
  for (const d of DOCTORS) {
    const userId = await createAuthUser(`Dr(a). ${d.name}`, 'doctor')
    if (!userId) continue

    doctorIds.push(userId)
    console.log(`  ✅ Dr(a). ${d.name}`)
  }
  console.log(`  → ${doctorIds.length} doctors\n`)

  // ============================================
  // 3. LINK DOCTORS TO CLINICS
  // ============================================
  console.log('🔗 Linking doctors to clinics...')
  const doctorClinicLinks: { doctor_id: string; clinic_id: string; specialty: string; crm: string }[] = []
  for (let i = 0; i < doctorIds.length; i++) {
    const numClinics = randomInt(1, 3)
    const selectedClinics = new Set<string>()
    for (let j = 0; j < numClinics; j++) {
      selectedClinics.add(clinicIds[randomInt(0, clinicIds.length - 1)])
    }
    for (const cid of Array.from(selectedClinics)) {
      doctorClinicLinks.push({
        doctor_id: doctorIds[i],
        clinic_id: cid,
        specialty: DOCTORS[i].specialty,
        crm: DOCTORS[i].crm,
      })
    }
  }
  if (doctorClinicLinks.length > 0) {
    const { error } = await supabase.from('doctor_clinics').insert(
      doctorClinicLinks.map(dc => ({
        clinic_id: dc.clinic_id, doctor_id: dc.doctor_id,
        specialty: dc.specialty, crm: dc.crm,
        is_available: true,
        available_days: [1, 2, 3, 4, 5],
        available_start: '08:00:00', available_end: '18:00:00',
      }))
    )
    if (error) console.error('  ❌ Link doctors:', error.message)
  }
  console.log(`  → ${doctorClinicLinks.length} links\n`)

  // ============================================
  // 4. STAFF
  // ============================================
  console.log('👥 Creating staff...')
  const staffIds: string[] = []
  for (const name of STAFF_NAMES) {
    const userId = await createAuthUser(name, 'staff')
    if (!userId) continue

    staffIds.push(userId)
    console.log(`  ✅ ${name}`)
  }

  // Link staff to clinics
  for (let i = 0; i < clinicIds.length && i * 2 < staffIds.length; i++) {
    const staffSlice = staffIds.slice(i * 2, i * 2 + 2)
    const { error } = await supabase.from('clinic_staff').insert(
      staffSlice.map(sid => ({ clinic_id: clinicIds[i], user_id: sid, role_in_clinic: i === 0 ? 'manager' : 'staff' }))
    )
    if (error) console.error('  ❌ Link staff:', error.message)
  }
  console.log(`  → ${staffIds.length} staff\n`)

  // ============================================
  // 5. PATIENTS (auth.users → profiles + patients table)
  // ============================================
  console.log('🏥 Creating patients...')
  const patientRecords: { id: string; clinic_id: string }[] = []
  for (let i = 0; i < 80; i++) {
    const firstName = PATIENT_FIRST_NAMES[randomInt(0, PATIENT_FIRST_NAMES.length - 1)]
    const lastName = PATIENT_LAST_NAMES[randomInt(0, PATIENT_LAST_NAMES.length - 1)]
    const gender = GENDERS[randomInt(0, GENDERS.length - 1)]
    const insuranceType = INSURANCE_TYPES[randomInt(0, 2)]
    const birthYear = randomInt(1950, 2010)
    const birthMonth = randomInt(1, 12)
    const birthDay = randomInt(1, 28)

    // Create auth user for patient
    const userId = await createAuthUser(`${firstName} ${lastName}`, 'patient')
    if (!userId) continue

    // Create patient record linked to auth user
    const { data, error } = await supabase.from('patients').insert([{
      user_id: userId,
      full_name: `${firstName} ${lastName}`,
      date_of_birth: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
      gender,
      cpf: null, // Avoid unique constraint collisions
      email: `${slugify(firstName)}.${slugify(lastName)}${randomInt(1,999)}@email.com`,
      phone: generatePhone(),
      insurance_type: insuranceType,
      insurance_name: insuranceType !== 'particular' ? INSURANCE_NAMES[randomInt(0, INSURANCE_NAMES.length - 1)] : null,
    }]).select().single()

    if (error) { console.error(`  ❌ Patient ${i}:`, error.message); continue }

    // Link to 1-2 random clinics
    const numClinics = randomInt(1, 2)
    for (let j = 0; j < numClinics; j++) {
      patientRecords.push({ id: data.id, clinic_id: clinicIds[randomInt(0, clinicIds.length - 1)] })
    }
  }

  // Insert clinic_patients (dedup)
  const uniquePatientClinics = Array.from(new Map(patientRecords.map(pc => [`${pc.id}-${pc.clinic_id}`, pc])).values())
  if (uniquePatientClinics.length > 0) {
    const { error } = await supabase.from('clinic_patients').insert(
      uniquePatientClinics.map(pc => ({ clinic_id: pc.clinic_id, patient_id: pc.id }))
    )
    if (error) console.error('  ❌ Link patients:', error.message)
  }
  console.log(`  → ${uniquePatientClinics.length} patient-clinic links\n`)

  // ============================================
  // 6. APPOINTMENTS (~300 between dates)
  // ============================================
  console.log('📅 Creating appointments...')
  const appointments: any[] = []
  for (let i = 0; i < 300; i++) {
    const clinicId = clinicIds[randomInt(0, clinicIds.length - 1)]
    const clinicDoctors = doctorClinicLinks.filter(dc => dc.clinic_id === clinicId)
    if (clinicDoctors.length === 0) continue

    const dc = clinicDoctors[randomInt(0, clinicDoctors.length - 1)]
    const patientClinic = uniquePatientClinics.filter(pc => pc.clinic_id === clinicId)
    if (patientClinic.length === 0) continue

    const pc = patientClinic[randomInt(0, patientClinic.length - 1)]
    const date = randomDate(dateStart, dateEnd)
    const startTime = randomTime()

    const statusWeights = [0.35, 0.15, 0.30, 0.12, 0.08]
    const r = Math.random()
    let cumulative = 0
    let chosenStatus: (typeof STATUSES)[number] = 'scheduled'
    for (let s = 0; s < STATUSES.length; s++) {
      cumulative += statusWeights[s]
      if (r < cumulative) { chosenStatus = STATUSES[s]; break }
    }

    appointments.push({
      clinic_id: clinicId,
      doctor_id: dc.doctor_id,
      patient_id: pc.id,
      date,
      start_time: startTime,
      type: APPT_TYPES[randomInt(0, 1)],
      status: chosenStatus,
    })
  }

  if (appointments.length > 0) {
    const { error } = await supabase.from('appointments').insert(appointments)
    if (error) console.error('  ❌ Appointments:', error.message)
    else console.log(`  → ${appointments.length} appointments\n`)
  }

  // ============================================
  // 7. CONTAS DE TESTE (credenciais conhecidas)
  // ============================================
  console.log('🔑 Creating test accounts...\n')

  // Staff account
  const staffUserId = await createAuthUser('Ana Recepcionista', 'staff')
  if (staffUserId) {
    await supabase.from('clinic_staff').insert({ clinic_id: clinicIds[0], user_id: staffUserId, role_in_clinic: 'staff' })
    console.log('  ✅ STAFF: ana.recepcionista@staff.com / senha123!')
  }

  // Doctor account (link to first clinic)
  const doctorUserId = await createAuthUser('Dr. Roberto Silva', 'doctor')
  if (doctorUserId) {
    await supabase.from('doctor_clinics').insert({
      clinic_id: clinicIds[0], doctor_id: doctorUserId,
      specialty: 'Cardiologia', crm: 'CRM/SP 99999',
      is_available: true, available_days: [1,2,3,4,5],
      available_start: '08:00:00', available_end: '18:00:00',
    })
    console.log('  ✅ DOCTOR: dr.roberto.silva@doctor.com / senha123!')
  }

  // Patient account
  const patientUserId = await createAuthUser('Maria Teste', 'patient')
  if (patientUserId) {
    const { data: patientRecord } = await supabase.from('patients').insert([{
      user_id: patientUserId,
      full_name: 'Maria Teste',
      date_of_birth: '1990-05-15',
      gender: 'F',
      email: 'maria.teste@email.com',
      phone: '(11) 99999-0000',
      insurance_type: 'particular',
    }]).select().single()

    if (patientRecord) {
      await supabase.from('clinic_patients').insert({ clinic_id: clinicIds[0], patient_id: patientRecord.id })
    }
    console.log('  ✅ PATIENT: maria.teste@patient.com / senha123!')
  }

  console.log('')

  // ============================================
  // SUMMARY
  // ============================================
  console.log('🎉 Seed complete!')
  console.log(`   Clinics:       ${clinicIds.length}`)
  console.log(`   Doctors:       ${doctorIds.length}`)
  console.log(`   Staff:         ${staffIds.length}`)
  console.log(`   Patient links: ${uniquePatientClinics.length}`)
  console.log(`   Appointments:  ${appointments.length}`)
  console.log(`   Date range:    ${dateStart.toISOString().split('T')[0]} → ${dateEnd.toISOString().split('T')[0]}`)
  console.log('\n🔑 Test accounts:')
  console.log('   STAFF:    ana.recepcionista@staff.com / senha123!')
  console.log('   DOCTOR:   dr.roberto.silva@doctor.com / senha123!')
  console.log('   PATIENT:  maria.teste@patient.com / senha123!')
}

seed().catch(console.error)
