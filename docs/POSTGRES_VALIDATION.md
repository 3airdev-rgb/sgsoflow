# Validação externa do PostgreSQL

Este procedimento deve ser executado quando uma instância PostgreSQL real estiver disponível. SQLite e bancos substitutos não são suportados. Os exemplos usam valores fictícios; não versione credenciais.

## 1. Configurar a conexão

Copie `.env.example` para `.env` e defina:

```dotenv
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO?schema=public"
```

O usuário precisa de permissão para criar tipos, tabelas, índices, funções e triggers no schema `public` durante a aplicação das migrations. Use PostgreSQL 15 ou superior (o ambiente de referência usa PostgreSQL 17), pois a migration regulatória utiliza unicidade com `NULLS NOT DISTINCT`.

## 2. Gerar o client e aplicar a migration

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

`pnpm db:migrate` executa `prisma migrate deploy` e deve aplicar, na ordem:

1. `20260828170000_stage_01_foundation`;
2. `20260828220000_stage_02_regulatory_engine`.

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

O seed é idempotente para as entidades estruturantes e para o catálogo controlado do RBAC 153 EMD 11. Ele cria sete requisitos/regras da Etapa 02 e grava um evento de auditoria identificado como ambiente local.

## 5. Executar os testes

```bash
pnpm test
pnpm test:e2e
```

Os testes unitários/integração usam doubles de persistência. O E2E estrutural cobre a tela de login; o fluxo autenticado de perfil → ativação → avaliação depende desta instância com migrations e seed aplicados. Instale o navegador uma vez com `pnpm exec playwright install chromium`.

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

Devem existir as tabelas da fundação e também `regulatory_profiles`, `regulatory_sources`, `regulatory_requirements`, `applicability_rules`, `applicability_assessments` e `applicability_assessment_items`, além de `_prisma_migrations`. Confirme também as proteções append-only/imutáveis:

```sql
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE event_object_table IN ('audit_logs', 'applicability_assessments', 'applicability_assessment_items')
ORDER BY event_object_table, trigger_name;
```

O resultado deve incluir `audit_logs_append_only`, `applicability_assessments_immutable` e `applicability_assessment_items_immutable`. Não execute `UPDATE` ou `DELETE` em dados reais apenas para testar os triggers.

Confirme o catálogo mínimo:

```sql
SELECT r.section, ru.version, ru.status
FROM regulatory_requirements r
JOIN applicability_rules ru ON ru.regulatory_requirement_id = r.id
ORDER BY r.section, ru.version;
```

O resultado esperado contém 153.51, 153.53, 153.55, 153.57, 153.59, 153.63 e 153.73.
