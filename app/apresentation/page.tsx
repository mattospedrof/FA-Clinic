import Link from 'next/link'

export default function ApresentationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ========== NAVBAR ========== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-800">FA Clinic</span>
            </div>

            {/* CTA */}
            <Link
              href="/login"
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            Plataforma de Gestão Clínica
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Gestão inteligente para
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              clínicas e consultórios
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Agendamentos, pacientes, médicos e relatórios em um só lugar.
            Simplifique a administração da sua clínica com a FA Clinic.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#Contact"
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
            >
              Começar Agora
            </Link>
            <a
              href="#funcionalidades"
              className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              Saiba Mais
            </a>
          </div>
        </div>
      </section>

      {/* ========== STATS ========== */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Clínicas Ativas' },
              { value: '50k+', label: 'Agendamentos/Mês' },
              { value: '10k+', label: 'Profissionais' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FUNCIONALIDADES ========== */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que sua clínica precisa
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ferramentas completas para administrar clínicas de qualquer porte
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Agendamentos',
                desc: 'Controle completo de consultas e exames com visão por dia, semana e mês. Evite conflitos de horário automaticamente.',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: 'Gestão de Pacientes',
                desc: 'Cadastro completo com CPF, convênio, endereço e histórico de consultas. Busca avançada e filtros personalizados.',
                color: 'bg-green-100 text-green-600',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Corpo Clínico',
                desc: 'Administre médicos, especialidades e agendas. Controle CRM, disponibilidade e alocação por clínica.',
                color: 'bg-purple-100 text-purple-600',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Dashboard e Relatórios',
                desc: 'Gráficos interativos de agendamentos, convênios, receita e métricas. Exporte dados em XLSX com filtros avançados.',
                color: 'bg-orange-100 text-orange-600',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                title: 'Multi-Clínicas',
                desc: 'Gerencie múltiplas clínicas simultaneamente. Cada clínica com seus médicos, horários e relatórios independentes.',
                color: 'bg-pink-100 text-pink-600',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Controle de Acesso',
                desc: 'Perfis de Administrador, Staff, Médico e Paciente. Permissões granulares por clínica e funcionalidade.',
                color: 'bg-indigo-100 text-indigo-600',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-blue-200 transition-all group">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${feature.color} group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PERFIS ========== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Perfis para cada necessidade
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Cada usuário acessa apenas o que precisa, com segurança e organização
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                role: 'Administrador',
                desc: 'Controle total da plataforma. Gerencia clínicas, usuários, relatórios globais e configurações.',
                gradient: 'from-red-500 to-rose-600',
                features: ['Gerenciar clínicas', 'Administrar usuários', 'Relatórios globais', 'Configurações'],
              },
              {
                role: 'Staff',
                desc: 'Recepcionistas e assistentes. Gerenciam agendamentos, pacientes e prontuários da clínica.',
                gradient: 'from-green-500 to-emerald-600',
                features: ['Criar agendamentos', 'Cadastrar pacientes', 'Prontuários', 'Filtros avançados'],
              },
              {
                role: 'Médico',
                desc: 'Acessa sua agenda, pacientes e prontuários. Registra evoluções e prescrições.',
                gradient: 'from-blue-500 to-indigo-600',
                features: ['Agenda pessoal', 'Prontuários', 'Prescrições', 'Evoluções'],
              },
              {
                role: 'Paciente',
                desc: 'Visualiza seus agendamentos, histórico médico e dados pessoais.',
                gradient: 'from-purple-500 to-violet-600',
                features: ['Meus agendamentos', 'Histórico médico', 'Dados pessoais', 'Prontuário'],
              },
            ].map((profile, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-2 bg-gradient-to-r ${profile.gradient}`}></div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{profile.role}</h3>
                  <p className="text-sm text-gray-600 mb-4">{profile.desc}</p>
                  <ul className="space-y-2">
                    {profile.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TECNOLOGIA ========== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                  Tecnologia de ponta
                </h2>
                <p className="text-lg text-gray-300 mb-8">
                  Construída com as melhores tecnologias do mercado para garantir
                  performance, segurança e confiabilidade.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Next.js 16', desc: 'Framework React' },
                    { name: 'Supabase', desc: 'Backend & Auth' },
                    { name: 'Tailwind CSS', desc: 'Estilização' },
                    { name: 'Recharts', desc: 'Gráficos' },
                  ].map((tech, i) => (
                    <div key={i} className="bg-white/10 rounded-xl p-4">
                      <div className="text-white font-semibold text-sm">{tech.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{tech.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { icon: '🔒', title: 'Segurança', desc: 'Autenticação via Supabase Auth com RLS e políticas de acesso granulares' },
                  { icon: '⚡', title: 'Performance', desc: 'Cache otimizado, carregamento paralelo e renderização eficiente' },
                  { icon: '📱', title: 'Responsivo', desc: 'Interface adaptada para desktop, tablet e celular' },
                  { icon: '♿', title: 'Acessibilidade', desc: 'Navegação por teclado, ARIA labels e skip links' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white/5 rounded-xl p-4">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-white font-semibold">{item.title}</div>
                      <div className="text-gray-400 text-sm mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA FINAL ========== */}
      <section id="Contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pronto para transformar sua clínica?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Comece agora e descubra como a FA Clinic pode simplificar a gestão do seu consultório.
          </p>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=frannkztech@gmail.com&su=Interesse%20na%20FA%20Clinic&body=Ol%C3%A1%2C%20meu%20nome%20%C3%A9%20(seu%20nome)!%0AGostaria%20de%20saber%20mais%20informa%C3%A7%C3%B5es%20para%20implementar%20sua%20ferramenta%20na%20minha%20cl%C3%ADnica."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Entre em Contato
          </a>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white font-semibold">FA Clinic</span>
            </div>
            <div className="text-sm text-center md:text-right">
              <p>&copy; 2026 FA Clinic - Uma criação da Frannkz Tech. Todos os direitos reservados.</p>
              <p className="mt-1">Desenvolvido com Next.js + Supabase</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
