# FA Clinic - Guia Completo do Sistema

## Visão Geral

FA Clinic é um sistema de gestão de clínicas médicas hospedado no Vercel, construído com Next.js 16 (App Router) e Supabase (PostgreSQL + Auth + SMTP).

**Landing page pública:** `/apresentation` — acessível sem autenticação.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS |
| Gráficos | Recharts |
| Banco de Dados | Supabase PostgreSQL |
| Autenticação | Supabase Auth (com verificação de email) |
| Email | Supabase SMTP nativo |
| Testes | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| Deploy | Vercel |
| Ícones | Lucide React |
| Datas | date-fns |

## Estrutura de Arquivos

```
Franco_Clinic/
├── app/
│   ├── layout.tsx                # Root layout com AuthProvider
│   ├── page.tsx                  # Home (redireciona para /apresentation)
│   ├── apresentation/page.tsx    # Landing page pública
│   ├── login/page.tsx            # Tela de login
│   ├── register/page.tsx         # Tela de registro com verificação de email
│   ├── auth/callback/page.tsx    # Callback de autenticação
│   └── dashboard/
│       ├── admin/page.tsx        # Dashboard MagoAdm (visão global)
│       ├── clinic/page.tsx       # Dashboard Clínica (métricas filtráveis)
│       ├── doctor/page.tsx       # Dashboard Médico (agenda multi-clínica)
│       ├── staff/page.tsx        # Dashboard Atendimento (agendar, pacientes)
│       └── patient/page.tsx      # Dashboard Paciente (consultas, receitas)
├── components/
│   └── DashboardLayout.tsx       # Layout compartilhado com sidebar responsiva
├── hooks/                        # Custom hooks (useDataCache, useCepSearch)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Supabase client (browser)
│   │   ├── server.ts             # Supabase client (server components)
│   │   └── auth-context.tsx      # Contexto de autenticação com role
│   └── utils.ts                  # Utilitários (CPF, CEP, idade, formatação)
├── proxy.ts                      # Middleware de proteção de rotas por role
├── supabase/                     # Scripts SQL (não versionado)
│   ├── schema.sql                # Schema completo do banco
│   └── *.sql                     # Scripts auxiliares (RLS, migrações)
├── .github/workflows/
│   └── ci.yml                    # GitHub Actions (build + test + lint)
├── vitest.config.ts              # Configuração do Vitest
├── vitest.setup.ts               # Setup do ambiente de testes
├── seed.ts                       # Script de seed do banco
├── .env.example                  # Variáveis de ambiente exemplo
└── .env.local                    # Variáveis locais (não versionado)
```

## CI/CD - GitHub Actions

O workflow `.github/workflows/ci.yml` roda automaticamente a cada push ou PR em `main/master`:

1. **Install**: `npm ci` (instalação limpa)
2. **Lint**: `npm run lint`
3. **Type check**: `npx tsc --noEmit`
4. **Build**: `npm run build`
5. **Testes**: `npm run test:run`

### Configurar secrets no GitHub:
- Acesse: **Settings → Secrets and variables → Actions**
- Adicione:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Banco de Dados - 13 Tabelas

### profiles
Extensão de `auth.users`. Armazena nome, email, role (admin/clinic/doctor/staff/patient), telefone e CPF. Criada automaticamente via trigger ao registrar usuário.

### clinics
Dados da clínica: nome, CNPJ, endereço completo, horário de funcionamento (opening_time, closing_time), intervalo de almoço, duração da consulta (padrão 30min), ticket médio (padrão R$40).

### clinic_staff
Vincula usuários com role "staff" a uma clínica específica. Cada clínica tem seu staff fixo.

### doctor_clinics
Vincula médicos a clínicas (multi-clínica). Armazena specialty, CRM, disponibilidade (dias da semana, horário início/fim, flag is_available).

### patients
Cadastro completo: nome, data de nascimento, gênero, CPF (validado), email, telefone, endereço (com CEP), tipo de convênio (particular/convenio/sus).

### clinic_patients
Vínculo paciente ↔ clínica. Cada clínica vê apenas seus pacientes. Um paciente pode estar em várias clínicas.

### appointments
Agendamentos: clinic_id, doctor_id, patient_id, date, start_time, end_time (calculado automaticamente), type (consultation/exam), status (scheduled/confirmed/cancelled/completed/no_show).

### exams
Catálogo de exames por clínica: nome, descrição, preço, duração.

### appointment_exams
Vincula exames a agendamentos.

### medical_records
Prontuários: diagnosis, evolution, notes. Vinculado a appointment, clinic, doctor e patient.

### prescriptions
Receitas médicas: content, vinculado a medical_record, clinic, doctor e patient.

### notifications
Notificações por usuário: title, message, type, is_read.

### clinic_metrics
Métricas cacheadas por clínica e data: total_patients, total_appointments, completed, cancelled, avg_age, estimated_revenue, new_patients.

## Funções SQL

| Função | Descrição |
|--------|-----------|
| `calculate_age(birth_date)` | Calcula idade a partir da data de nascimento |
| `validate_cpf(cpf)` | Valida CPF com algoritmo dos dígitos verificadores |
| `update_updated_at()` | Trigger para atualizar campo updated_at |
| `handle_new_user()` | Cria profile automaticamente ao registrar usuário |
| `calc_appointment_times()` | Calcula end_time automaticamente baseado no start_time + duration |

## Row Level Security (RLS)

Todas as 13 tabelas têm RLS ativado. Políticas:

- **Admin**: acesso total a todas as tabelas
- **Clínica (staff)**: SELECT/INSERT/UPDATE apenas em appointments da sua clínica
- **Médico**: SELECT/UPDATE apenas em appointments onde é o doctor_id
- **Paciente**: SELECT apenas em seus próprios appointments e dados

## Middleware - Proteção de Rotas

O arquivo `proxy.ts` gerencia o acesso às rotas:

- `/apresentation` → Landing page pública (sem auth)
- `/login`, `/register`, `/auth/*` → Rotas públicas de autenticação
- `/` → Redireciona para `/apresentation`
- `/dashboard/*` → Protegido por role (admin, clinic, doctor, staff, patient)

### Roles e redirecionamentos:
| Role | Rota |
|------|------|
| admin | /dashboard/admin |
| clinic | /dashboard/clinic |
| doctor | /dashboard/doctor |
| staff | /dashboard/staff |
| patient | /dashboard/patient |

## Autenticação

Fluxo:
1. Usuário registra em `/register` com nome, email, senha e tipo (patient/doctor)
2. Supabase Auth envia email de verificação automaticamente
3. Após verificar email, faz login em `/login`
4. Proxy lê a sessão e redireciona para `/dashboard/{role}`
5. AuthContext carrega o role do profile para controle de menu

## Componentes Principais

### DashboardLayout
Layout compartilhado com sidebar responsiva. Menu configurado por role via `MENU_CONFIG`. Mostra sidebar desktop em telas grandes e menu hamburger em mobile.

### AuthContext
Gerencia estado de autenticação. Fornece `user`, `session`, `role`, `loading`, `signIn`, `signUp`, `signOut`. Escuta mudanças de auth state via subscription.

### utils.ts
| Função | Uso |
|--------|-----|
| `validateCpf(cpf)` | Validação regex + algoritmo dígitos |
| `calculateAge(birthDate)` | Calcula idade |
| `formatCpf(value)` | Formata para XXX.XXX.XXX-XX |
| `formatPhone(value)` | Formata para (XX) XXXXX-XXXX |
| `fetchCep(cep)` | Busca endereço na ViaCEP API |

## Telas por Role

### MagoAdm (admin)
- Dashboard global com métricas de todas as clínicas
- Cards: total clínicas, pacientes, agendamentos, receita estimada
- Gráficos: barras (consultas por clínica), pizza (distribuição)
- Tabela de clínicas ativas

### Clínica (clinic)
- Dashboard filtrável por período, faixa etária, gênero
- Cards: pacientes, novos no mês, consultas concluídas, receita, ticket médio
- Gráficos: barras (consultas por semana), linha (pacientes ativos)

### Médico (doctor)
- Lista de clínicas vinculadas com horário de funcionamento
- Próximas consultas e histórico com botões de confirmar/cancelar
- Visualização toggle: upcoming / past

### Atendimento (staff)
- Cards: agendamentos hoje, total pacientes, fila
- Formulário de cadastro de paciente com auto-preenchimento de CEP
- Tabela de agendamentos com busca

### Paciente (patient)
- Cards: consultas futuras, exames, receitas
- Lista de próximas consultas com status
- Lista de receitas com conteúdo e médico

## Configuração Inicial

### 1. Criar projeto Supabase
- Acesse https://supabase.com e crie um projeto
- Copie a URL e a anon key

### 2. Executar o schema
- No SQL Editor do Supabase, cole e execute `supabase/schema.sql`

### 3. Configurar variáveis
- Copie `.env.example` para `.env.local`
- Preencha com as credenciais do Supabase

### 4. Criar conta admin
- Registre uma conta normalmente em `/register`
- No Supabase, rode: `UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';`

### 5. Rodar localmente
```bash
npm install
npm run dev
```

### 6. Deploy no Vercel
- Conecte o repositório ao Vercel
- Adicione as variáveis de ambiente no painel do Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Deploy automático a cada push
- Acesse: `https://seu-dominio.vercel.app/apresentation`

## Regras de Negócio

- Cada consulta tem duração fixa de 30 minutos (configurável por clínica)
- Ticket médio padrão: R$40,00
- Receita estimada = consultas concluídas × ticket médio
- Médico pode estar vinculado a múltiplas clínicas com agenda independente
- Staff é fixo em uma clínica
- Paciente tem conta global, mas cada clínica vê apenas seu vínculo
- CPF é validado no frontend e no banco
- CEP auto-preenchido via ViaCEP
- Email de verificação obrigatório no registro

## Testes Automatizados

O projeto usa **Vitest** + **React Testing Library** para testes automatizados.

### Estrutura de testes:
- `**/*.test.ts` → Testes de utils e hooks
- `**/*.test.tsx` → Testes de componentes React

### Comandos:
```bash
npm test              # Watch mode (desenvolvimento)
npm run test:run      # Roda uma vez (CI/CD)
npm run test:coverage # Com relatório de cobertura
```

### Configuração:
- `vitest.config.ts` → Configuração do Vitest
- `vitest.setup.ts` → Setup de ambiente (jsdom, mocks)

### Cobertura atual:
- Utils: validação CPF, cálculo de idade, formatação
- Hooks: useDataCache, useCepSearch
- Componentes: DashboardLayout, DataTable, filtros

## Acessibilidade

- Skip link para navegação por teclado
- ARIA labels em todos os componentes interativos
- Roles semânticos (nav, main, banner, contentinfo)
- Focus management em modais e dropdowns
- Contraste WCAG AA em todos os textos

## Performance

- Cache com `Promise.all` em 6 arquivos
- Hooks otimizados: `useDataCache`, `useCepSearch`
- Skeletons em 7 páginas para loading states
- ErrorBoundary no root layout
- Tratamento de erros de rede em 7 páginas
