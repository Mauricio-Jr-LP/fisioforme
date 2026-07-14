# FisioForme — Documento de Contexto do Projeto

> **Propósito deste arquivo:** servir de contexto completo para qualquer pessoa ou modelo de IA
> continuar o desenvolvimento. Leia este arquivo antes de qualquer alteração.
> Última atualização: 2026-07-10.

---

## 1. A ideia

Sistema de gestão para uma **clínica de fisioterapia**, com três públicos:

1. **Equipe da clínica (admin/fisioterapeuta)** — gerencia pacientes, tratamentos, consultas e agenda.
2. **Paciente com login** — portal onde vê a própria ficha, tratamentos, histórico de consultas e agendamentos.
3. **Visitante sem login** — página pública de agendamento: escolhe serviço, vê horários livres calculados em tempo real e solicita um horário informando nome/e-mail/telefone (fica `pending` até a clínica confirmar).

### Funcionalidades implementadas

- **Pacientes**: CRUD completo com ficha clínica (anamnese: queixa principal, histórico médico, alergias, medicações), notas de evolução (linha do tempo), vínculo opcional a um login do portal.
- **Tratamentos**: por paciente, com **etapas ordenadas** (status, sessões alvo/realizadas — barra de progresso), diagnóstico, status (ativo/pausado/concluído/cancelado).
- **Consultas/Evoluções**: formato **SOAP** (Subjetivo, Objetivo, Avaliação, Plano) + escala de dor EVA 0–10, vinculáveis a tratamento/etapa/agendamento. Registrar consulta em uma etapa incrementa `completed_sessions` automaticamente.
- **Anexos**: fotos/arquivos em consultas, tratamentos ou pacientes, via **Supabase Storage** (bucket privado `attachments`, URLs assinadas geradas pelo backend).
- **Tipos de serviço**: nome, duração em minutos, preço, cor (usada na agenda). Duração determina o tamanho do slot.
- **Disponibilidade**: regras semanais recorrentes (ex.: seg–sex 08–12 / 13–18) + exceções por data (bloqueio de dia inteiro, bloqueio parcial ou janela extra).
- **Motor de horários** (`apps/api/src/services/availability.ts`): calcula slots livres = janelas da regra semanal ± exceções − agendamentos não cancelados, granularidade configurável (30min default em `clinic_settings`), fuso `America/Sao_Paulo`, não oferece horário no passado. Trava anti-double-booking na reserva (`isSlotFree`).
- **Agendamentos**: status `pending | confirmed | completed | cancelled | no_show`; agenda staff com visão semana/dia; agendamento público cria registro com `is_public_booking=true` e dados do convidado.
- **Dashboard**: totais (pacientes, agendamentos hoje/semana, tratamentos ativos, pendências), próximos agendamentos e próximos horários livres.
- **Portal do paciente**: ficha, tratamentos com etapas, histórico de consultas com anexos.
- **Autenticação**: Supabase Auth (e-mail/senha). Papéis: `admin`, `therapist`, `patient` (tabela `profiles`, criada por trigger ao registrar usuário).

### Ideias/roadmap (ainda NÃO implementado)

- Lembretes por WhatsApp/e-mail de consultas (confirmação automática do agendamento público).
- Financeiro: pagamentos por sessão, pacotes de sessões, recibos.
- Prescrição de exercícios domiciliares (biblioteca de exercícios com vídeo/foto, plano para o paciente marcar como feito).
- Gráfico de evolução da dor (EVA) ao longo das consultas.
- Multi-profissional: agenda por fisioterapeuta (o schema já tem `therapist_id` em `appointments`).
- Relatórios/exportação PDF da ficha e evoluções.
- Notificações no portal do paciente; auto-cadastro de paciente vinculando ao e-mail do agendamento público.

---

## 2. Stack e decisões técnicas

| Camada | Escolha | Observações |
|---|---|---|
| Monorepo | npm workspaces | `apps/api`, `apps/web`, `packages/shared` |
| Backend | Node 20+, **Express 4**, TypeScript ESM | roda com `tsx` (sem build de emit; `build` = typecheck) |
| Validação | Zod | em todas as rotas de escrita |
| Banco | **Postgres (Supabase)** acesso via `pg` Pool + SQL puro | **sem ORM** (decisão consciente) |
| Auth | Supabase Auth | backend valida Bearer token via `supabaseAdmin.auth.getUser()` |
| Storage | Supabase Storage, bucket privado `attachments` | upload direto do front com token do usuário; backend registra metadados e assina URLs |
| Frontend | React 18 + Vite + **Chakra UI v2** + react-router v6 + TanStack Query | **mobile-first** |
| Datas | dayjs (+utc/timezone) | fuso da clínica: env `CLINIC_TZ`, default `America/Sao_Paulo` |
| Deploy alvo | **Render** (API como web service, front como static site) + **Supabase cloud** | `render.yaml` na raiz |

**Convenções importantes:**
- Backend usa a **service role key** (bypassa RLS); a autorização é feita nas rotas (`requireStaff`, `requireAuth`). O RLS existe como segunda camada para acesso direto ao Supabase pelo front (portal/público).
- Tipos de domínio ficam em `packages/shared/src/index.ts` (importado como `@fisioforme/shared` direto do fonte `.ts`, sem build).
- Textos de UI e mensagens de erro em **português**.
- Updates parciais: rotas PUT montam `SET` dinâmico a partir das chaves validadas pelo Zod (whitelist).

---

## 3. Estrutura do repositório

```
fisioforme/
├── package.json              # workspaces + scripts (dev, build, typecheck)
├── .env                      # ambiente LOCAL já preenchido (não versionar)
├── .env.example
├── render.yaml               # blueprint de deploy no Render
├── PROJETO.md                # este arquivo
├── README.md
├── packages/shared/src/index.ts   # todos os tipos de domínio + labels PT-BR
├── supabase/
│   ├── config.toml           # portas remapeadas p/ 55xxx (evita conflito com outro projeto local)
│   ├── migrations/0001_init.sql   # schema completo + RLS + triggers
│   ├── migrations/0002_storage.sql # bucket attachments + policies
│   └── seed.sql              # serviços, horários seg–sáb, 3 pacientes exemplo
└── apps/
    ├── api/src/
    │   ├── index.ts          # express app, CORS, monta routers em /api/*
    │   ├── config/env.ts     # carrega .env da raiz do monorepo
    │   ├── db/pool.ts        # pg Pool + query()/queryOne()
    │   ├── lib/{http,supabase,time}.ts  # AppError/asyncHandler, supabaseAdmin/signedUrl, dayjs tz
    │   ├── middleware/auth.ts # attachUser + requireAuth/requireStaff/requireAdmin
    │   ├── services/availability.ts     # motor de slots + isSlotFree
    │   └── routes/           # auth, patients, treatments, consultations,
    │                         # appointments (+publicBookingRouter), availability,
    │                         # serviceTypes, attachments, dashboard, portal, settings
    └── web/src/
        ├── main.tsx / App.tsx / theme.ts     # rotas + tema Chakra
        ├── context/AuthContext.tsx           # sessão Supabase + perfil (/api/auth/me)
        ├── lib/{api,supabase,upload,format}.ts
        ├── components/{AdminLayout,PortalLayout,SlotPicker,ui}.tsx
        └── pages/
            ├── public/{Landing,PublicBooking}.tsx
            ├── Login.tsx
            ├── admin/{Dashboard,Agenda,Patients,PatientDetail,
            │        TreatmentDetail,Services,Availability,SettingsPage}.tsx
            └── portal/{PortalHome,PortalConsultations}.tsx
```

---

## 4. Banco de dados (resumo do schema)

Enums: `user_role`, `gender_type`, `appointment_status`, `treatment_status`, `stage_status`, `attachment_entity`.

- `profiles` (id = auth.users.id, role, full_name…) — trigger `on_auth_user_created` cria automaticamente.
- `patients` (ficha completa; `profile_id` opcional vincula ao login do portal).
- `patient_notes` (linha do tempo de anotações).
- `service_types` (name, duration_minutes, price, color, active).
- `availability_rules` (weekday 0=domingo, start_time, end_time, active).
- `availability_exceptions` (date, is_available, start/end_time nulos = dia inteiro, reason).
- `appointments` (patient_id nullable, service_type_id, therapist_id, start/end_time, status, is_public_booking + guest_name/email/phone).
- `treatments` → `treatment_stages` (order_index, target_sessions, completed_sessions).
- `consultations` (SOAP + pain_level 0–10, FKs opcionais p/ treatment/stage/appointment).
- `attachments` (entity_type + entity_id polimórfico, file_path no bucket).
- `clinic_settings` (chave/valor JSONB; chave `clinic` tem `slot_granularity_minutes`).

RLS: staff (função `is_staff()`) tem acesso total; paciente logado só SELECT nos próprios registros; `service_types`, `availability_*` e `clinic_settings` têm leitura pública (necessário p/ agendamento sem login).

---

## 5. API (todas sob `/api`)

| Rota | Auth | Descrição |
|---|---|---|
| `GET /health` | — | healthcheck (fora de /api) |
| `GET /api/auth/me` | token | id, role, full_name, patient_id |
| `GET/POST/PUT/DELETE /api/patients[...]` | staff | CRUD + `GET /:id` retorna ficha com treatments/consultations/notes/appointments; `POST /:id/notes` |
| `GET/POST/PUT/DELETE /api/treatments[...]` | staff | CRUD + etapas em `/:id/stages[/:stageId]` |
| `GET/POST/PUT/DELETE /api/consultations[...]` | staff | SOAP; POST com `stage_id` incrementa sessões da etapa |
| `GET/POST/PATCH/DELETE /api/attachments` | staff | metadados pós-upload; DELETE remove do Storage também |
| `GET/POST/PUT/DELETE /api/service-types` | GET público / escrita staff | DELETE = soft (active=false) |
| `GET /api/availability/slots?date=YYYY-MM-DD&service_type_id=…` | **público** | slots livres |
| `GET/POST/DELETE /api/availability/rules` e `/exceptions` | GET público / escrita staff | |
| `GET/POST/PUT/PATCH(:id/status)/DELETE /api/appointments` | staff | filtros from/to/status/patient_id |
| `POST /api/public/bookings` | **público** | valida slot livre; cria `pending` com dados do convidado |
| `GET /api/dashboard` | staff | estatísticas + próximos agendamentos + próximos slots |
| `GET /api/portal/me`, `/portal/consultations`, `/portal/treatments/:id` | paciente | somente a própria ficha |
| `GET/PUT /api/settings/clinic` | GET público / PUT staff | nome, telefone, endereço, granularidade |

---

## 6. Frontend (rotas)

- `/` landing pública · `/agendar` fluxo de agendamento público (serviço → data → slot → dados → confirmação) · `/login`
- `/admin` dashboard · `/admin/agenda` (semana/dia, criar/mover status) · `/admin/pacientes[/:id]` · `/admin/tratamentos/:id` · `/admin/servicos` · `/admin/disponibilidade` · `/admin/configuracoes`
- `/portal` home do paciente · `/portal/consultas`
- Guards por papel no `App.tsx` (staff → /admin, patient → /portal).
- Mobile-first: sidebar vira drawer/bottom-nav no mobile; formulários em modais Chakra.

---

## 7. Ambiente local (JÁ CONFIGURADO nesta máquina)

Supabase local roda no **Docker** via CLI (`npx supabase start`). As portas foram **remapeadas para 55xxx**
no `supabase/config.toml` porque existe outro projeto local (`nit-local`) nas portas padrão 54xxx.

| Serviço | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API | http://localhost:4000 |
| Supabase API | http://127.0.0.1:55321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` |
| Supabase Studio | http://127.0.0.1:55323 |

- `.env` na **raiz** já preenchido com as chaves locais (o backend carrega a partir de `apps/api/src/config/env.ts`).
- **Usuário admin de teste:** `admin@fisioforme.local` / `admin123` (role `admin` já aplicado em `profiles`).
- Seed aplicado: 5 tipos de serviço, horários seg–sex 08–12/13–18 + sáb 08–12, 3 pacientes de exemplo.

**Comandos:**
```bash
npm install               # na raiz (workspaces)
npx supabase start        # sobe stack local (dados persistem entre stop/start)
npm run dev               # API (4000) + front (5173) juntos
npm run typecheck         # typecheck de todos os workspaces
npx supabase stop         # para a stack
```

**Status verificado (2026-07-10):** migrações + seed aplicados; API testada de ponta a ponta
(login admin, dashboard, slots, agendamento público com trava anti-conflito funcionando); front servindo.

---

## 8. Deploy (planejado, ainda não executado)

1. **Supabase cloud**: criar projeto, rodar `0001_init.sql` + `0002_storage.sql` + `seed.sql` no SQL Editor.
2. **Render** (`render.yaml` na raiz):
   - Web service `fisioforme-api`: build `npm install`, start `npm run start:api`, env vars do `.env.example` (com chaves do projeto cloud).
   - Static site `fisioforme-web`: build `npm install && npm run build:web`, publish `apps/web/dist`, rewrite `/* → /index.html`, env `VITE_*`.
3. Ajustar `WEB_ORIGIN` (CORS) para a URL do front no Render.

---

## 9. Como continuar (dicas para o próximo modelo/dev)

- Rode `npm run typecheck` antes de considerar qualquer mudança pronta.
- Novas tabelas → criar `supabase/migrations/000N_nome.sql` (idempotente, com RLS) e aplicar com `npx supabase db reset` (recria + seed) ou rodando o SQL no Studio.
- Novos endpoints → seguir o padrão dos routers existentes (Zod + asyncHandler + AppError; montar em `apps/api/src/index.ts`).
- Novas páginas → registrar rota em `App.tsx`, usar TanStack Query + `lib/api.ts` (que injeta o Bearer token da sessão Supabase).
- O item mais valioso do roadmap segundo o dono: **lembretes/confirmação automática** do agendamento público e **prescrição de exercícios domiciliares**.
