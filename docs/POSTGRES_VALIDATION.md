# Validação externa do PostgreSQL

Este procedimento deve ser executado quando uma instância PostgreSQL real estiver disponível. SQLite e bancos substitutos não são suportados. Os exemplos usam valores fictícios; não versione credenciais.

## 1. Configurar a conexão

Copie `.env.example` para `.env` e defina:

```dotenv
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO?schema=public"
```

O usuário precisa de permissão para criar tipos, tabelas, índices, funções e triggers no schema `public` durante a aplicação da migration.

## 2. Gerar o client e aplicar a migration

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

`pnpm db:migrate` executa `prisma migrate deploy` e deve aplicar `20260828170000_stage_01_foundation`.

## 3. Verificar o estado

```bash
pnpm exec prisma migrate status
```

O resultado esperado informa que o schema está atualizado e que não há migrations pendentes.

## 4. Executar o seed local

Defina `SEED_ADMIN_EMAIL` e uma `SEED_ADMIN_PASSWORD` fictícia de pelo menos 12 caracteres, exclusiva do ambiente local. Depois execute:

```bash
pnpm db:seed
```

O seed é idempotente para as entidades estruturantes e grava um evento de auditoria identificado como ambiente local.

## 5. Executar os testes

```bash
pnpm test
pnpm test:e2e
```

Os testes unitários/integração usam doubles de persistência. O E2E atualmente aprovado cobre a tela de login; a ampliação dos fluxos E2E autenticados, contexto e bloqueio cross-tenant depende desta instância com migration e seed aplicados. Instale o navegador uma vez com `pnpm exec playwright install chromium`.

## 6. Iniciar a aplicação

```bash
pnpm dev
```

A aplicação deverá responder em `http://localhost:3000`.

## 7. Confirmar as tabelas

Com `psql` disponível em Bash:

```bash
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

Em PowerShell:

```powershell
psql $env:DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

Devem existir `users`, `organizations`, `airports`, `memberships`, `airport_accesses`, `sessions` e `audit_logs`, além de `_prisma_migrations`. Confirme também a proteção append-only:

```sql
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'audit_logs';
```

O resultado deve incluir `audit_logs_append_only`. Não execute `UPDATE` ou `DELETE` em dados reais apenas para testar o trigger.
