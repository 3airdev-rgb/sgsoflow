# Estado de desenvolvimento

## ETAPA ATUAL: 02

## STATUS

## ETAPA 02 — APROVADA

**B — CONCLUÍDA COM VALIDAÇÃO EXTERNA POSTGRESQL PENDENTE.**

A implementação e a auditoria normativa da Etapa 02 estão concluídas sobre a baseline aprovada `bdecfa136ca2dd38bf5e81e7ca91756acd2f8861`. Este documento integra o checkpoint Git anterior ao início de qualquer Etapa 03.

### VALIDADO

- Schema Prisma válido e Prisma Client gerado.
- Migration incremental revisada estaticamente, sem alteração da migration da Etapa 01.
- Regulatory Applicability Engine `1.0.0` com condições JSON seguras, explicabilidade e `REVIEW_REQUIRED`.
- 39/39 testes unitários e de integração isolada aprovados, incluindo T01–T17 e auditoria de precedência A–G.
- Auditoria normativa concluída para as sete seções autorizadas do RBAC 153 EMD 11.
- Precedência SGSO, uso privativo, separação entre regime exigido e situação declarada e salvaguarda militar verificados.
- 1/1 E2E estrutural Playwright/Chromium aprovado.
- Lint, typecheck e build de produção aprovados.
- Multi-tenancy e autorização revisados para Organization → Airport → RegulatoryProfile/Assessment.
- Audit Log server-side para perfil, ativação, supersession, catálogo, regras e assessments.
- `docs/TRACEABILITY.md` preenchido para os RFs e RNFs desta etapa.

### PENDENTE POR LIMITAÇÃO DO AMBIENTE

- **Pendente: aplicação das migrations contra instância PostgreSQL real.** Não há serviço na porta 5432 nem Docker neste host.
- **Pendente: validação integrada PostgreSQL de migration, seed, perfil, ativação, avaliação, histórico, triggers e Audit Log.**
- **Pendente: E2E autenticado de Configurações → Perfil Regulatório → criação → ativação → avaliação.** O Chromium está funcional, mas o fluxo depende de PostgreSQL migrado e seedado.

## LOCAL PREVIEW MODE — APROVADO

**Status: Ferramenta permanente de desenvolvimento.**

Características:

- exclusivo de development;
- exige `NODE_ENV === "development"`;
- exige `LOCAL_PREVIEW_MODE === "true"`;
- read-only;
- sem PostgreSQL;
- sem persistência;
- sem Audit Log real;
- bloqueio server-side de mutações;
- não disponível em produção;
- 52 testes aprovados.

Toda futura rota ou serviço mutável deverá aplicar a política central de bloqueio de Local Preview e possuir teste de regressão correspondente.

Consulte `docs/LOCAL_PREVIEW.md`.

## ETAPA 02 — IMPLEMENTADO

- Perfil regulatório versionado por aeródromo, com estados `DRAFT`, `ACTIVE` e `SUPERSEDED`.
- Fonte, requisito e regra normativa modelados separadamente.
- Assessments e itens históricos imutáveis, com versão do motor e da regra.
- Regimes `SGSO`, `PGSO`, `CRITICAL_SAFETY_ASPECTS` e `REVIEW_REQUIRED`.
- Seed controlado do RBAC 153 EMD 11 para 153.51, 153.53, 153.55, 153.57, 153.59, 153.63 e 153.73.
- Interface em Configurações → Perfil Regulatório.
- APIs protegidas para listar/criar/ativar perfis e executar/consultar assessments.
- Serviço de catálogo restrito a `SYSTEM_ADMIN`, com versionamento de regras e auditoria.

## MIGRATIONS

- `20260828170000_stage_01_foundation`: fundação, sete tabelas e Audit Log append-only.
- `20260828220000_stage_02_regulatory_engine`: seis entidades regulatórias, enums, FKs compostas, índices, unicidade de perfil ativo, constraints temporais e triggers de imutabilidade.

## TESTES

- Etapa 01 preservada: autenticação, contexto, autorização, validação e Audit Log.
- Etapa 02: T01–T17 obrigatórios, condição insegura, precedência A–G, uso privativo e separação entre regime exigido e situação declarada.
- Total atual: 39 testes unitários/integração isolada e 1 E2E estrutural.
- Resultado: 39/39 e 1/1 aprovados.

## SEGURANÇA E INTEGRIDADE

- IDs do frontend não provam autorização; serviços repetem sessão, Membership, Organization e Airport.
- Queries de perfil/assessment combinam `organizationId`, `airportId` e IDs do recurso.
- FK composta impede assessment ligado a perfil de outro aeródromo.
- FK composta impede item ligado a regra de outro requisito.
- Somente administradores compatíveis gerenciam perfis/assessments; somente `SYSTEM_ADMIN` gerencia catálogo/regras.
- Audit Log e assessments não possuem API de exclusão; triggers PostgreSQL impedem mutação direta comum.

## DÍVIDAS E LIMITAÇÕES

- Validação real das duas migrations e do seed no PostgreSQL.
- E2E autenticado completo com banco.
- A configuração `package.json#prisma` emite aviso de depreciação para Prisma 7; não afeta Prisma 6.14.
- A condição militar/compartilhada é uma salvaguarda decisória do produto que exige revisão das condições cumulativas do RBAC 153.5(a)(2), não uma isenção automática.
- O catálogo permanece limitado às sete seções autorizadas nesta etapa.

## ETAPA 01 — CHECKPOINT

- Commit aprovado: `bdecfa136ca2dd38bf5e81e7ca91756acd2f8861`.
- Branch/remote: `main` → `origin/main`, [repositório oficial](https://github.com/3airdev-rgb/sgsoflow.git).
- Classificação preservada: **B — concluída com validação externa PostgreSQL pendente**.
- Migration: `20260828170000_stage_01_foundation`.
- Entidades: `User`, `Organization`, `Airport`, `Membership`, `AirportAccess`, `Session` e `AuditLog`.

## CONTROLE DE ESCOPO

Não foram implementados Política de Segurança Operacional, objetivos de Safety, MGSO, Safety Reporting, investigações, perigos, GRSO, matriz de risco, AISO, PESO, indicadores, relatórios, auditorias SGSO, CSO, PISOA, treinamentos, promoção, Management of Change, Compliance Matrix completa ou IA.

Não iniciar a Etapa 03 sem instrução explícita e sem checkpoint aprovado da Etapa 02.
