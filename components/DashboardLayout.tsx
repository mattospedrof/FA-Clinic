'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/supabase/auth-context'
import {
  Activity,
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  FileText,
  LogOut,
  Building2,
  UserCog,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

const MENU_CONFIG: Record<string, Array<{ href: string; icon: any; label: string }>> = {
  admin: [
    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard Geral' },
    { href: '/dashboard/admin/clinics', icon: Building2, label: 'Clínicas' },
    { href: '/dashboard/admin/users', icon: UserCog, label: 'Usuários' },
    { href: '/dashboard/admin/patients', icon: Users, label: 'Pacientes' },
    { href: '/dashboard/admin/appointments', icon: Calendar, label: 'Agendamentos' },
    { href: '/dashboard/admin/reports', icon: FileText, label: 'Relatórios' },
  ],
  clinic: [
    { href: '/dashboard/clinic', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/clinic/patients', icon: Users, label: 'Pacientes' },
    { href: '/dashboard/clinic/appointments', icon: Calendar, label: 'Agendamentos' },
    { href: '/dashboard/clinic/staff', icon: UserCog, label: 'Equipe' },
    { href: '/dashboard/clinic/reports', icon: FileText, label: 'Relatórios' },
  ],
  doctor: [
    { href: '/dashboard/doctor', icon: LayoutDashboard, label: 'Minha Agenda' },
    { href: '/dashboard/doctor/availability', icon: Settings, label: 'Disponibilidade' },
    { href: '/dashboard/doctor/patients', icon: Users, label: 'Meus Pacientes' },
    { href: '/dashboard/doctor/records', icon: FileText, label: 'Prontuários' },
    { href: '/dashboard/doctor/prescriptions', icon: Stethoscope, label: 'Receitas' },
  ],
  staff: [
    { href: '/dashboard/staff', icon: LayoutDashboard, label: 'Painel' },
    { href: '/dashboard/staff/appointments', icon: Calendar, label: 'Agendamentos' },
    { href: '/dashboard/staff/patients', icon: Users, label: 'Pacientes' },
    { href: '/dashboard/staff/queue', icon: ListOrdered, label: 'Fila' },
  ],
  patient: [
    { href: '/dashboard/patient', icon: LayoutDashboard, label: 'Painel' },
    { href: '/dashboard/patient/appointments', icon: Calendar, label: 'Consultas' },
    { href: '/dashboard/patient/exams', icon: Stethoscope, label: 'Exames' },
    { href: '/dashboard/patient/prescriptions', icon: FileText, label: 'Receitas' },
  ],
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, role, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const menu = MENU_CONFIG[role || 'patient'] || []

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Skip link para acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Pular para o conteúdo principal
      </a>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col" aria-label="Menu principal">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">FA Clinic</h1>
              <p className="text-xs text-slate-400">Gestão de Clínicas</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1" aria-label="Navegação do dashboard">
          {menu.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="px-4 py-2 mb-3">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6" />
          <span className="font-bold">FA Clinic</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          <ChevronDown className={`w-6 h-6 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-slate-900 text-white z-40 p-4 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      )}

      <main id="main-content" className="flex-1 overflow-auto mt-14 md:mt-0" role="main">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
