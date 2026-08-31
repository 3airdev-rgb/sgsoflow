# Estado de desenvolvimento

## ETAPA ATUAL: 03

## STATUS

## ETAPA 03 — APROVADA

**B — CONCLUÍDA COM VALIDAÇÃO EXTERNA POSTGRESQL PENDENTE.**

Baseline utilizada: `145d29193624c065d79c919c5f6f3584bb30dbbd` (`main` sincronizada com `origin/main` antes da implementação).

### VALIDADO NA ETAPA 03

- Separação entre `SystemRole`, `RegulatoryRole` e `RegulatoryAuthority`.
- Catálogo inicial limitado a Gestor Responsável, responsável pelo SGSO, gestores operacionais e membro da CSO.
- Designações com rascunho, ativação, supersession, revogação, vigência e histórico sem hard delete.
- Funções exclusivas protegidas por serviço central e trigger PostgreSQL; acumulação distingue `ALLOWED`, `PROHIBITED`, `RECOMMENDATION`, `NOT_REQUIRED` e `REQUIRES_REVIEW` conforme classe e perfil.
- Regulatory Authority Matrix depende de designação ativa, aeródromo, período e mapeamento vigente; role técnica isolada nunca concede autoridade.
- Ato formal de designação com vigência, histórico, supersession, revogação, hierarquia, prerrogativas e limites.
- Comunicação à ANAC controlada por prazo de 30 dias, estado e evidência humana, sem integração ou protocolo fictício.
- CSO com aplicabilidade calculada server-side, composição vinculada a designações vigentes, membros obrigatórios/adicionais e vigência.
- Regulatory Authority Matrix e Authority Service dependentes de designação ativa e vigente no aeródromo.
- Multi-tenancy Organization → Airport aplicado a designações, CSO e membros.
- Audit Log server-side para catálogos, designações, supersession/revogação, CSO e membros.
- Local Preview read-only preservado, com bloqueio antes de autorização, serviço, Prisma e Audit Log.
- GOV-01 a GOV-20 e GOV-AUD-01 a GOV-AUD-17 aprovados; total da suíte: 89 testes em 11 arquivos.
- Lint, typecheck, build de produção, Prisma validate e geração completa do Prisma Client aprovados.
- 1/1 E2E estrutural Playwright/Chromium aprovado; o navegador foi executado a partir de diretório temporário do ambiente.

### PENDENTE POR LIMITAÇÃO DO AMBIENTE

- **Pendente: aplicação das migrations contra instância PostgreSQL real.**
- Validação integrada de constraints, triggers, seed, designações, CSO e Audit Log no PostgreSQL.
- E2E autenticado completo da Estrutura Organizacional com banco migrado e seedado.

### CHECKPOINT E IMUTABILIDADE DE MIGRATION

- Baseline anterior: `145d29193624c065d79c919c5f6f3584bb30dbbd`.
- Migration da Etapa 03: `20260829140000_stage_03_governance_authority`.
- A migration da Etapa 03 nunca foi aplicada em PostgreSQL real e não integrou checkpoint anterior.
- A partir do checkpoint aprovado da Etapa 03, `20260829140000_stage_03_governance_authority` é **IMUTÁVEL**. Toda alteração futura de schema deverá utilizar uma nova migration incremental.

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
- `20260829140000_stage_03_governance_authority`: funções, responsabilidades, designações, autoridades, matriz de autoridade, CSO, membros, constraints temporais e proteção histórica.

## TESTES

- Etapa 01 preservada: autenticação, contexto, autorização, validação e Audit Log.
- Etapa 02: T01–T17 obrigatórios, condição insegura, precedência A–G, uso privativo e separação entre regime exigido e situação declarada.
- Total atual: 39 testes unitários/integração isolada e 1 E2E estrutural.
- Resultado: 39/39 e 1/1 aprovados.
- Etapa 03: GOV-01 a GOV-20 para autoridade, vigência, exclusividade, histórico, CSO, tenant, Audit Log e Local Preview.
- Total atual: 89 testes unitários/integração isolada em 11 arquivos e 1 E2E estrutural.

## ETAPA 03 — AUDITORIA NORMATIVA FINAL

**Status: IMPLEMENTADA E AUDITADA ESTATICAMENTE; validação PostgreSQL real pendente.**

- GOV-AUD-01 a GOV-AUD-17 aprovados: acumulação por classe, recomendações não bloqueantes, prazo de 30 dias, notificação com evidência, aplicabilidade/composição da CSO e bloqueio do Local Preview.
- Regras baseadas no RBAC 153 EMD 11, especialmente 153.15(a), 153.15(b), 153.15(e), Apêndice A, 153.23, 153.25 e 153.53(b)/(c).
- Ato de designação, hierarquia, prerrogativas/limites e controle `PENDING`/`OVERDUE`/`SUBMITTED`/`NOT_APPLICABLE` registrados.
- Aplicabilidade da CSO derivada server-side do assessment; composição exige titulares regulamentares aplicáveis e aceita membros adicionais.
- Nenhuma role técnica prova função regulamentar. Nenhuma conformidade operacional da CSO ou do MOPS é declarada.
- Pendente: aplicação e testes da migration da Etapa 03 contra instância PostgreSQL real.

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

Não foram implementados Política de Segurança Operacional, objetivos de Safety, MGSO, Safety Reporting, investigações, perigos, GRSO, matriz de risco, AISO, PESO, indicadores, relatórios, auditorias SGSO completas, reuniões/atas/decisões operacionais da CSO, PISOA, treinamentos, promoção, Management of Change, Compliance Matrix completa ou IA.

Não iniciar a Etapa 04 sem instrução explícita e sem revisão/checkpoint aprovado da Etapa 03.
