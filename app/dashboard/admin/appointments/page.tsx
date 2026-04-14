'use client'

import StaffAppointmentsPage from '@/app/dashboard/staff/appointments/page'

// Admin e staff compartilham a mesma interface de gestão de agendamentos
export default function AdminAppointmentsPage() {
  return <StaffAppointmentsPage />
}
