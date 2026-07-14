# 🩺 FisioForme

Sistema completo de gestão para clínicas de fisioterapia: **pacientes, prontuário, tratamentos com etapas, evoluções (SOAP) com fotos, agenda com disponibilidade configurável, agendamento público (sem login) e portal do paciente.**

Monorepo **Node + TypeScript** (API Express) + **React + Chakra UI** (mobile-first), banco no **Supabase** (Postgres + Auth + Storage), deploy no **Render**.

---

## ✨ Funcionalidades

| Área | O que faz |
|------|-----------|
| **Painel** | Indicadores do dia, próximos atendimentos, solicitações pendentes e próximos horários livres. |
| **Pacientes** | Cadastro, busca, prontuário completo (dados + anamnese), anotações em linha do tempo. |
| **Tratamentos** | Planos com **etapas**, metas de sessões e barra de progresso; status (ativo/pausado/concluído). |
| **Evoluções** | Registro **SOAP** (Subjetivo/Objetivo/Avaliação/Plano) + escala de dor (EVA) + **anexo de fotos/arquivos**. |
| **Agenda** | Agendamentos por dia, mudança rápida de status, criação com seletor de horários livres. |
| **Serviços** | Tipos de atendimento com **duração**, preço e cor. |
| **Disponibilidade** | Janelas **semanais recorrentes** + **exceções** (feriados, bloqueios, horários extras). |
| **Agendamento público** | Página `/agendar` — o paciente escolhe serviço/horário e informa contato, **sem login**. |
| **Portal do paciente** | Login próprio para ver ficha, tratamentos, agendamentos e evoluções (com fotos). |

### Motor de horários
O endpoint `/api/availability/slots` calcula os horários realmente livres combinando: regras semanais → exceções do dia → agendamentos já ocupados → duração do serviço → granularidade configurável. Nunca oferece horário no passado nem sobreposto.

---

## 🏗️ Arquitetura

```
fisioforme/
├── packages/shared/        # Tipos TypeScript compartilhados (domínio)
├── apps/api/               # Backend Express + pg + Supabase (auth/storage)
│   └── src/
│       ├── routes/         # patients, appointments, treatments, ...
│       ├── services/       # availability (cálculo de slots)
│       ├── middleware/     # auth (valida JWT do Supabase)
│       └── db/pool.ts      # conexão Postgres
├── apps/web/               # React + Vite + Chakra UI
│   └── src/
│       ├── pages/          # admin/, portal/, public/
│       ├── components/     # layouts, SlotPicker, ui
│       ├── context/        # AuthContext (Supabase Auth)
│       └── lib/            # api, supabase, upload, format
├── supabase/               # migrations, seed, storage
└── render.yaml             # blueprint de deploy
```

O **frontend** autentica direto no Supabase Auth (JWT). O **backend** valida esse JWT e acessa o banco com **service role** (autorização feita no middleware por papel). O acesso direto ao banco (portal) é protegido por **RLS**.

**Papéis:** `admin`, `therapist` (staff) e `patient`. Novos cadastros entram como `patient`.

---

## 🚀 Setup local

### 1. Pré-requisitos
- Node 20+
- Uma conta/projeto no [Supabase](https://supabase.com)

### 2. Banco de dados (Supabase)
No **SQL Editor** do seu projeto, rode em ordem:
1. `supabase/migrations/0001_init.sql` — tabelas, enums, triggers e RLS
2. `supabase/storage.sql` — bucket `attachments` e policies
3. `supabase/seed.sql` — *(opcional)* serviços, horários e pacientes de exemplo

### 3. Variáveis de ambiente
```bash
cp .env.example .env
```
Preencha com os dados do projeto (Supabase → **Project Settings**):
- **API**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (aba *API*)
- **DATABASE_URL**: aba *Database → Connection string → URI* (use o **pooler**, porta 5432)
- **Frontend**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### 4. Instalar e rodar
```bash
npm install
npm run dev          # sobe API (:4000) e Web (:5173) juntos
```
- Front: http://localhost:5173
- API:   http://localhost:4000/health

### 5. Criar o primeiro usuário staff
1. Acesse `/login`, aba **Criar conta**, e cadastre-se (vira `patient`).
2. Promova a admin no **SQL Editor**:
   ```sql
   update profiles set role = 'admin' where email = 'seu@email.com';
   ```
3. Faça login novamente → você cai na área administrativa `/app`.

### 6. Dar acesso ao portal a um paciente
Vincule a conta (auth) à ficha do paciente:
```sql
update patients
set profile_id = (select id from profiles where email = 'paciente@email.com')
where id = 'ID_DO_PACIENTE';
```
O paciente então enxerga a própria ficha em `/portal`.

---

## ☁️ Deploy no Render

1. Suba o repositório no GitHub.
2. No Render: **New → Blueprint** e aponte para o repo (usa `render.yaml`).
3. Serão criados dois serviços: **fisioforme-api** (web/node) e **fisioforme-web** (static).
4. Preencha as variáveis marcadas `sync:false`:
   - API: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_ORIGIN` (= URL do site).
   - Web: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (= URL da API).
5. Rode as migrações no Supabase (passo 2 acima) uma única vez.

> Dica: primeiro faça deploy da API, copie a URL para `VITE_API_URL` (web); depois copie a URL do web para `WEB_ORIGIN` (api) e faça *redeploy*.

---

## 📡 Principais rotas da API

| Método | Rota | Acesso |
|--------|------|--------|
| `GET` | `/api/dashboard` | staff |
| `GET/POST/PUT/DELETE` | `/api/patients` | staff |
| `POST` | `/api/patients/:id/notes` | staff |
| `GET/POST/PUT/DELETE` | `/api/treatments` · `/:id/stages` | staff |
| `GET/POST/PUT/DELETE` | `/api/consultations` | staff |
| `GET/POST/DELETE` | `/api/attachments` | staff |
| `GET/POST/PUT/PATCH/DELETE` | `/api/appointments` | staff |
| `GET` | `/api/service-types` | público (leitura) |
| `GET` | `/api/availability/slots?date=&service_type_id=` | público |
| `GET/POST/DELETE` | `/api/availability/rules` · `/exceptions` | staff (escrita) |
| `POST` | `/api/public/bookings` | **público** (agendamento sem login) |
| `GET` | `/api/portal/me` · `/consultations` · `/treatments/:id` | paciente |

---

## 🧩 Stack
**Backend:** Node, TypeScript, Express, pg, Zod, dayjs, @supabase/supabase-js
**Frontend:** React 18, Vite, Chakra UI, TanStack Query, React Router, react-icons
**Infra:** Supabase (Postgres + Auth + Storage), Render

## 💡 Próximas evoluções sugeridas
- Notificações por e-mail/WhatsApp na confirmação de agendamento
- Lembretes automáticos de sessão
- Relatórios (frequência, faturamento, evolução da dor por período)
- Assinatura digital de documentos e emissão de recibos
- Visão de agenda semanal/mensal em calendário

---

Feito com 💙 para clínicas de fisioterapia.
