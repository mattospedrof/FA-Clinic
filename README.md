# FA Clinic

Sistema de gestão de clínicas médicas hospedado no Vercel.

## 🌐 Landing Page

Acesse a página de apresentação: [FA Clinic](https://seu-dominio.vercel.app/apresentation)

## Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth com verificação de email
- **Testes**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions
- **Deploy**: Vercel

## Funcionalidades

- Landing page pública com apresentação do sistema (`/apresentation`)
- Dashboard **MagoAdm** — visão global de todas as clínicas
- Dashboard **Clínica** — métricas filtráveis com gráficos
- Dashboard **Médico** — agenda multi-clínica com gestão de disponibilidade
- Dashboard **Atendimento** — agendamento, cadastro de pacientes com CEP automático
- Dashboard **Paciente** — consultas, exames e receitas
- Filtros avançados e exportação XLSX
- Acessibilidade: navegação por teclado, ARIA labels, skip links
- Paginação e cache otimizado

## Como Rodar

```bash
npm install
cp .env.example .env.local
# Preencha .env.local com suas credenciais Supabase
npm run dev
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Roda ESLint |
| `npm test` | Roda testes (watch mode) |
| `npm run test:run` | Roda testes uma vez |
| `npm run test:coverage` | Roda testes com cobertura |

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o schema: `supabase/schema.sql` no SQL Editor
3. Copie as credenciais para `.env.local`

## CI/CD - GitHub Actions

Este projeto usa GitHub Actions para integração contínua:

- **Build automático** a cada push/PR em `main`
- **Testes automatizados** com Vitest
- **Lint e type check** antes do deploy

### Secrets necessários no GitHub:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Configure em: **Settings → Secrets and variables → Actions**

## Deploy

Conecte este repositório ao [Vercel](https://vercel.com) e adicione as variáveis de ambiente no painel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Estrutura do Projeto

```
Franco_Clinic/
├── app/                      # Rotas Next.js (App Router)
│   ├── apresentation/page.tsx # Landing page pública
│   ├── login/                # Autenticação
│   ├── register/             # Registro
│   └── dashboard/            # Dashboards por role
├── components/               # Componentes React
├── hooks/                    # Custom hooks
├── lib/                      # Utils e configurações
├── public/                   # Assets estáticos
├── supabase/                 # Scripts SQL (não versionado)
└── .github/workflows/        # CI/CD
```

---

Projeto desenvolvido por **Frannkz Tech** — FA Clinic 2026
