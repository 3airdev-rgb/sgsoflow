# SGSOFlow — Perfil regulatório e motor de aplicabilidade (Etapa 02)

Micro SaaS multi-tenant para gerenciamento da segurança operacional de aeródromos brasileiros. Sobre a fundação aprovada da Etapa 01, esta entrega adiciona perfil regulatório versionado, catálogo normativo controlado, regras seguras e avaliações explicáveis. Nenhum processo funcional de SGSO/PGSO foi antecipado.

## Stack

Next.js 16, React 19, TypeScript estrito, PostgreSQL 17, Prisma 6, Zod, Tailwind CSS 4, Vitest e Playwright. Sessões opacas são persistidas no PostgreSQL; o cookie contém o token aleatório e `httpOnly`, enquanto o banco guarda somente SHA-256 do token. Senhas usam bcrypt com custo 12 no seed.

## Execução local

Requisitos: Node.js 20.9+, pnpm e Docker com Compose.

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Abra `http://localhost:3000`. As credenciais locais vêm de `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`; altere-as antes de qualquer ambiente compartilhado. Nunca versione `.env`.

## Verificações

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## Estrutura

- `prisma/`: schema, migration versionada e seed idempotente.
- `src/app/`: páginas e APIs HTTP; rotas privadas recuperam a sessão no servidor.
- `src/server/auth/`: identidade, sessões e contexto autenticado.
- `src/server/authorization/`: policies centrais de RBAC e escopo de tenant/aeródromo.
- `src/server/audit/`: gravação backend de eventos append-only.
- `src/server/context/`: mudança transacional e auditada do contexto ativo.
- `src/server/regulatory/`: motor, versionamento, catálogo e serviços regulatórios.
- `src/server/validation/`: contratos Zod.
- `tests/`: testes unitários/integração isolada e E2E estrutural.
- `docs/`: arquitetura e estado de desenvolvimento.

## Banco e migrations

`DATABASE_URL` deve apontar para PostgreSQL. Em desenvolvimento, crie novas migrations com `pnpm db:migrate:dev --name descricao`; em deploy, use `pnpm db:migrate`. As migrations incluem UUIDs, FKs, índices, unicidades temporais e triggers que protegem Audit Log e assessments históricos contra `UPDATE`/`DELETE`.

## Segurança

As APIs nunca confiam no tenant vindo do cliente: recuperam a identidade pela sessão, constroem grants a partir das associações ativas e aplicam policies centrais. Consultas a aeródromos combinam IDs autorizados e `organizationId`, bloqueando enumeração/manipulação cross-tenant. Autenticação e autorização permanecem separadas. O campo `mfaEnrolledAt` é apenas um ponto de extensão; MFA não está implementado.

Consulte [Motor regulatório](docs/REGULATORY_ENGINE.md), [Rastreabilidade](docs/TRACEABILITY.md), [Arquitetura](docs/ARCHITECTURE.md), [Validação PostgreSQL externa](docs/POSTGRES_VALIDATION.md) e [Estado do desenvolvimento](docs/DEVELOPMENT_STATE.md).
