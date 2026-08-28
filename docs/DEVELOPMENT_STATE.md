# Estado de desenvolvimento

## ETAPA ATUAL: 01

## STATUS

**B — CONCLUÍDA COM VALIDAÇÃO EXTERNA PENDENTE.**

**ETAPA 01 aprovada como baseline técnica.** O checkpoint Git foi criado na branch `main` com a fundação validada, sem funcionalidades da Etapa 02.

### VALIDADO

- Schema Prisma válido e Prisma Client gerado.
- Coerência estática entre schema e migration: 7 tabelas, 11 foreign keys e 14 índices/constraints de unicidade correspondentes.
- Trigger PostgreSQL append-only do Audit Log presente na migration.
- 11 testes unitários/integração aprovados.
- 1 teste E2E estrutural Playwright/Chromium aprovado.
- Lint, typecheck e build de produção aprovados.
- Revisões de multi-tenancy e Audit Log concluídas sem vulnerabilidade comprovada.

### PENDENTE POR LIMITAÇÃO DO AMBIENTE

- **Pendente: aplicação da migration contra instância PostgreSQL real.** O host não possui PostgreSQL nem Docker; `prisma migrate deploy` e `prisma migrate status` não conseguiram conectar a `127.0.0.1:5432`.
- Validação E2E autenticada (login real, área protegida e seletores) depende de PostgreSQL com migration e seed aplicados. O Chromium está funcional e o E2E estrutural foi executado.

## FUNCIONALIDADES IMPLEMENTADAS

- Autenticação por senha, sessão opaca segura, logout e proteção server-side.
- Multi-tenancy Organization → Airport com Membership e AirportAccess.
- RBAC técnico centralizado e permissions reutilizáveis.
- Seletor autorizado e auditado de organização/aeródromo ativo.
- Audit Log backend append-only.
- Soft delete estrutural e tratamento HTTP consistente de erros.
- Layout mínimo com Dashboard e Configurações.

## MIGRATIONS CRIADAS

- `20260828170000_stage_01_foundation`: enums, 7 tabelas, FKs, índices, constraints e trigger append-only.

## TESTES EXISTENTES

- Autenticação válida e inválida.
- Organization e Airport autorizados.
- Bloqueios cross-tenant e por manipulação de IDs.
- Mudança autorizada/não autorizada de contexto.
- Criação de Audit Log no login e na troca de contexto.
- Validação Zod de User, Organization e Airport.
- E2E estrutural da página de login (aprovado em Chromium).

## DECISÕES ARQUITETURAIS

- User sem `organizationId`; associações representam escopo e role.
- Autenticação independente das policies de autorização.
- Sessão em banco com token SHA-256 e cookie `httpOnly`.
- Roles de sistema separadas de futuras autoridades regulamentares.
- PostgreSQL é o único banco de produção; testes de serviços usam doubles isolados.

## PENDÊNCIAS

- Aplicar e verificar a migration em PostgreSQL real conforme `docs/POSTGRES_VALIDATION.md`.
- Executar E2E autenticado de login, área protegida, seleção de organização/aeródromo e rejeição cross-tenant após disponibilizar PostgreSQL com seed.
- MFA, recuperação de senha, rate limiting distribuído e administração visual de acessos.

## ETAPA 01 — CHECKPOINT

- **Checkpoint Git:** repositório inicializado na branch `main`; a baseline está registrada no commit com mensagem `chore: establish approved stage 01 foundation baseline` (hash consultável com `git rev-parse HEAD`).
- **Migration existente:** `20260828170000_stage_01_foundation`.
- **Entidades:** `User`, `Organization`, `Airport`, `Membership`, `AirportAccess`, `Session` e `AuditLog`; enums `EntityStatus` e `SystemRole`.
- **Testes existentes:** 11 unitários/integração e 1 E2E estrutural.
- **Testes aprovados:** 11/11 unitários/integração; 1/1 E2E Playwright/Chromium.
- **Limitações ambientais:** ausência de PostgreSQL/Docker impede aplicação real da migration, seed e E2E autenticado.
- **Dívidas técnicas conhecidas:** MFA, recuperação de senha, rate limiting distribuído, UI de administração de acessos e cobertura E2E autenticada com banco real.
- **Fora do escopo:** classificação regulatória e todos os módulos funcionais de SGSO, inclusive Política e Objetivos, Safety Reporting, perigos, GRSO, AISO, PESO, garantia, auditorias, PISOA, promoção, change management e compliance matrix.

## PRÓXIMA ETAPA PREVISTA

Etapa 02, somente após instrução explícita. Não iniciada.
