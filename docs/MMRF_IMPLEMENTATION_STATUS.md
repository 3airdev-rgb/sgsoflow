# Consolidação MMRF × implementação — pós-Etapa 03

## Escopo e método

Esta é uma visão documental **as built** da baseline `a9ae1c99d8bd14643832a295ee3d11cb92b79caf`. Foram confrontados README, estado de desenvolvimento, rastreabilidade, documentação PostgreSQL, Regulatory Engine, governança, Local Preview, schema Prisma, três migrations, serviços, domínio, APIs, UI, autorização, Audit Log e testes. A MMRF original não foi alterada.

Estados usados:

- `IMPLEMENTED`: comportamento completo no escopo aprovado e verificável sem infraestrutura externa.
- `PARTIALLY_IMPLEMENTED`: parte funcional existe, mas falta integração necessária ao próprio requisito.
- `IMPLEMENTED_PENDING_EXTERNAL_VALIDATION`: código, estrutura e testes isolados existem, mas persistência, constraints, triggers ou fluxo autenticado aguardam PostgreSQL real.
- `PREPARED_NOT_ACTIVE`: preparação específica existe, mas nenhum processo funcional a consome.
- `NOT_IMPLEMENTED`: requisito da etapa devida sem implementação.
- `FUTURE_SCOPE`: requisito deliberadamente reservado a etapa futura.

## Resumo dos requisitos funcionais

Foram revisados 34 RFs distintos: 22 relacionados às Etapas 01–03 e 12 reservados à Etapa 04.

| Status | Quantidade |
|---|---:|
| IMPLEMENTED | 3 |
| PARTIALLY_IMPLEMENTED | 1 |
| IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | 18 |
| PREPARED_NOT_ACTIVE | 0 |
| NOT_IMPLEMENTED | 0 |
| FUTURE_SCOPE | 12 |

## Matriz as-built — Etapas 01 a 03

As colunas `ENTIDADE` e `SERVICE` detalham separadamente o campo canônico `DOMAIN/SERVICE`; `DEPENDÊNCIA_EXTERNA` informa se PostgreSQL real é requerido.

| MMRF_ID | NOME | ETAPA_PREVISTA | STATUS | ENTIDADE | SERVICE | API | UI | TESTE | DEPENDÊNCIA_EXTERNA | OBSERVAÇÃO |
|---|---|---|---|---|---|---|---|---|---|---|
| RF-001 | Perfil regulatório por aeródromo | 01 fundação / 02 funcional | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatoryProfile` | `regulatory/service.ts`, `profile-versioning.ts` | `/api/regulatory/airports/[airportId]/profiles` | Perfil Regulatório | T07, T08, T12–T17 | Migration/fluxo em PostgreSQL | Perfil versionado e tenant-scoped; persistência real não validada. |
| RF-002 | Motor central de aplicabilidade | 02 | IMPLEMENTED | snapshots de domínio | `regulatory/engine.ts` | consumido pelo serviço de assessment | Resultado regulatório | T01–T06, T10–T11, cenários A–G | nenhuma para lógica pura | Engine `1.0.0`, precedência e revisão conclusivamente testadas. |
| RF-003 | Catálogo de fontes e requisitos | 02 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatorySource`, `RegulatoryRequirement` | `regulatory/catalog-service.ts` | sem API pública de catálogo nesta baseline | sem UI de catálogo | testes indiretos do engine/segurança | Migration e seed PostgreSQL | Seed deliberadamente limitado às sete seções autorizadas. |
| RF-004 | Regras de aplicabilidade versionadas | 02 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `ApplicabilityRule` | `createApplicabilityRuleVersion` | sem API pública de catálogo | sem UI de catálogo | condição insegura, T09, T11 | Persistência/versionamento real | Condições seguras existem; catálogo é serviço restrito a `SYSTEM_ADMIN`. |
| RF-005 | Assessments e itens históricos | 02 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `ApplicabilityAssessment`, `ApplicabilityAssessmentItem` | `executeRegulatoryAssessment`, `getRegulatoryAssessment` | `/assessments`, `/regulatory/assessments/[assessmentId]` | Perfil Regulatório | T09–T11, T16 | Transação, FKs e triggers PostgreSQL | Histórico é imutável por desenho e migration. |
| RF-006 | Estrutura gerencial do operador por aeródromo | 01 fundação / 03 funcional | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatoryRole`, `RegulatoryDesignation` | `governance/service.ts` | `/api/governance/airports/[airportId]/designations` | Estrutura Organizacional | GOV-05–08 | Migration e seed PostgreSQL | Estrutura, titulares e períodos estão modelados. |
| RF-007 | Responsabilidades e autoridade separadas de role técnica | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatoryResponsibility`, `RegulatoryAuthority`, `RegulatoryRoleAuthority` | `governance/catalog-service.ts` | sem API de catálogo | matriz somente leitura | GOV-01, GOV-02, GOV-18 | Seed e persistência PostgreSQL | `SystemRole`, `RegulatoryRole` e `RegulatoryAuthority` são independentes. |
| RF-008 | Explicabilidade da avaliação | 02 | IMPLEMENTED | `EngineAssessment`, `AssessmentItemResult` | `evaluateRegulatoryApplicability` | resposta do assessment | resultados e rationales | T05, T06, cenários A–G | nenhuma para lógica pura | Rationale e atributos considerados são explícitos. |
| RF-009 | Versionamento temporal e preservação histórica | 01 fundação / 02 funcional | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | perfis, regras, assessments | `profile-versioning.ts`, catálogo | APIs de perfil/assessment | Perfil Regulatório | T07–T11, T16 | Constraints/triggers PostgreSQL | Estratégia em código validada; enforcement real pendente. |
| RF-010 | Identificação SGSO, PGSO, aspectos críticos e revisão | 01 fundação / 02 funcional | IMPLEMENTED | `ManagementRegime` | `evaluateRegulatoryApplicability` | assessment | Perfil Regulatório | T01–T04, A–G, privativo | nenhuma para decisão pura | SGSO prevalece; declarado não substitui exigido. |
| RF-031 | Catálogo de funções regulamentares | 01 fundação / 03 funcional | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatoryRole` | catálogo de governança | sem API de catálogo | matriz/estrutura | GOV-01, GOV-08 | Seed PostgreSQL | Cinco responsáveis do 153.15(a) e membro CSO. |
| RF-032 | Designações com ato, vigência e estados | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatoryDesignation` | criar, ativar, revogar, notificar | rotas de designação | histórico de designações | GOV-03–07, GOV-AUD-09–11 | Transações/triggers PostgreSQL | Inclui ato, prazo ANAC, hierarquia e limites. |
| RF-033 | Gestor Responsável exclusivo e histórico | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `ACCOUNTABLE_MANAGER`, `RegulatoryDesignation` | ativação/supersession | ativar/revogar | estrutura e histórico | GOV-02, GOV-05–07 | Trigger de exclusividade PostgreSQL | Um titular por período; workflow futuro não antecipado. |
| RF-034 | Responsável vigente pelo SGSO | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `SAFETY_MANAGER` | `findActiveDesignation`, authority service | leitura via workspace | estrutura | GOV-08 | Seed/designações PostgreSQL | Autoridades funcionais estruturais estão catalogadas. |
| RF-035 | Gestores operacionais | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | operações, manutenção, emergência | catálogo/designações | rotas de designação | estrutura | catálogo e suíte GOV | Seed/designações PostgreSQL | Funções rastreiam 153.27, 153.29 e 153.31. |
| RF-036 | Acumulação por classe e entre aeródromos | 03 | PARTIALLY_IMPLEMENTED | perfil + designações | `evaluateAccumulation`, `evaluateStaffingCoverage`, `evaluateMultiAirportAccumulation`, `evaluateHolderMultiAirportAccumulation` | nenhuma API multi-aeródromo | alertas de staffing no workspace; sem consumo multi-aeródromo | GOV-19, GOV-AUD-01–08 | PostgreSQL para consulta integrada | Regras puras estão corretas; o avaliador multi-aeródromo exportado não é chamado por API, UI ou criação/ativação. |
| RF-037 | Estrutura e aplicabilidade da CSO | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `SafetyCommittee` | criar/atualizar e avaliar aplicabilidade | rotas de committees | Estrutura Organizacional | GOV-10, GOV-16, GOV-AUD-12 | Migration/assessment PostgreSQL | Estrutura CSO implementada; reuniões e atas são escopo futuro distinto. |
| RF-038 | Membros e composição da CSO | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `SafetyCommitteeMember` | adicionar/revogar/composição | rotas de members | lista e resultado estrutural | GOV-11, GOV-17, GOV-AUD-13–15 | FKs e dados reais PostgreSQL | Distingue membros obrigatórios e adicionais. |
| RF-039 | Regulatory Authority Matrix temporal | 03 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `RegulatoryAuthority`, `RegulatoryRoleAuthority` | `canPerformRegulatoryAction` | sem endpoint próprio | matriz somente leitura | GOV-01–04, GOV-18, GOV-20 | Seed e persistência PostgreSQL | Serviço existe, mas workflows futuros ainda não são consumidores. |
| RF-040 | Histórico e Audit Log de governança | 01 fundação / 03 funcional | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | `AuditLog` e entidades históricas | `recordAuditEvent`, serviços transacionais | eventos produzidos pelas APIs | sem UI de auditoria | GOV-06, GOV-07, GOV-13, GOV-14 | Trigger append-only e transações PostgreSQL | Geração server-side implementada; enforcement real pendente. |
| RF-184 | Autorização administrativa regulatória | 02 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | Membership/AirportAccess | policies e serviços regulatórios | todas as APIs regulatórias | páginas privadas | T12 | Contexto real em PostgreSQL | Policies são testadas isoladamente; fluxo autenticado integral pendente. |
| RF-185 | Isolamento Organization → Airport → perfil/assessment | 02 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | relações compostas | autorização e regulatory services | APIs regulatórias | contexto ativo | T13–T15 | FKs/queries em PostgreSQL real | IDs do cliente não constituem autorização. |

## Etapa 04 — implementação complementar sem mapeamento canônico inventado

Foi implementada a capacidade de Política e Objetivos da Segurança Operacional com versionamento, aprovação por autoridade vigente, ativação/supersession, revisão, comunicação, objetivos, multi-tenancy, Audit Log e Local Preview read-only. Evidências: `docs/SAFETY_POLICY_AND_OBJECTIVES.md`, migration `20260831120000_stage_04_safety_policy_objectives` e testes POL-01 a POL-22. Status técnico: `IMPLEMENTED_PENDING_EXTERNAL_VALIDATION`.

Como os nomes oficiais individuais de RF-019 a RF-030 ainda não constam dos documentos versionados, nenhuma associação requisito–capacidade é presumida. As linhas abaixo permanecem `FUTURE_SCOPE` até que a MMRF canônica permita rastreabilidade individual sem invenção.

A definição nominal individual de RF-019 a RF-030 não está presente nos documentos versionados consultados. Para não inventar conteúdo da MMRF, os nomes abaixo registram somente o agrupamento informado nesta revisão. Todos permanecem fora do escopo funcional atual.

| MMRF_ID | NOME | ETAPA_PREVISTA | STATUS | ENTIDADE | SERVICE | API | UI | TESTE | DEPENDÊNCIA_EXTERNA | OBSERVAÇÃO |
|---|---|---|---|---|---|---|---|---|---|---|
| RF-019 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | PostgreSQL real | Implementação complementar existe; associação individual aguarda definição canônica. |
| RF-020 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-021 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-022 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-023 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-024 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-025 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-026 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-027 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-028 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-029 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |
| RF-030 | Política e objetivos — definição nominal não disponível | 04 | FUTURE_SCOPE | não mapeado | não mapeado | não mapeado | não mapeado | não mapeado | idem | Implementação complementar existe; associação individual não presumida. |

## Requisitos não funcionais

| ID | Tema as-built | Status | Evidência | Dependência/limite |
|---|---|---|---|---|
| RNF-001 | Autenticação obrigatória | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | sessão opaca, bcrypt, cookie `httpOnly`, testes de login | sessão real e E2E autenticado dependem de PostgreSQL |
| RNF-002 | Autorização backend | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | policies centrais, 403 e testes | grants reais dependem de Membership/AirportAccess persistidos |
| RNF-003 | Multi-tenancy | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | Organization/Airport em queries e testes cross-tenant | FKs e integração real pendentes |
| RNF-004 | Proteção backend/menor privilégio | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | permissões por role e escopo | fluxo completo real pendente |
| RNF-005 | MFA | PARTIALLY_IMPLEMENTED | somente `mfaEnrolledAt` como ponto de extensão | autenticação MFA não existe |
| RNF-006 | Auditabilidade | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | eventos server-side e trigger append-only | transações/trigger não executados em PostgreSQL real |
| RNF-008 | Tratamento de erros | IMPLEMENTED | `AppError`, respostas 401/403/404/409 e mensagem genérica 500 | sem dependência externa |
| RNF-010 | Integridade referencial | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | FKs, checks e índices nas migrations | execução PostgreSQL pendente |
| RNF-011 | Imutabilidade/histórico | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION | versionamento em código e triggers | enforcement PostgreSQL pendente |
| RNF-014 | Rastreabilidade | PARTIALLY_IMPLEMENTED | `TRACEABILITY.md` normalizado e fontes normativas | nomes canônicos de RF-019–RF-030 ainda não constam dos documentos fornecidos |
| RNF-015 | Autoridade futura separada de role técnica | PREPARED_NOT_ACTIVE | matriz e GOV-01 | workflow futuro não implementado |
| RNF-016 | Decisão de autoridade explicável | PREPARED_NOT_ACTIVE | Authority Service e GOV-18 | workflow futuro não implementado |
| RNF-017 | Autoridade condicionada à designação vigente | PREPARED_NOT_ACTIVE | GOV-02–04 e GOV-20 | workflow futuro não implementado |
| RNF-018 | Arquitetura de autoridade sem IA ativa | PREPARED_NOT_ACTIVE | inspeção e suíte GOV | workflow futuro não implementado |

Outros RNFs observados: `.gitignore` protege secrets e artefatos; validação Zod e TypeScript estrito estão ativos; build e testes são reproduzíveis; Local Preview exige development, é read-only e não persiste.

## Implementações complementares sem RF canônico confirmado

As capacidades abaixo permanecem implementadas, porém sem associação a identificador fictício:

- controle do ato de designação, prazo de 30 dias e evidência humana da comunicação à ANAC;
- prerrogativas estruturais do Safety Manager para acesso ao Gestor Responsável e aos dados necessários;
- guardas adicionais do Local Preview para governança, notificação e composição da CSO.

Os identificadores não confirmados `RF-041`, `RF-042` e `RNF-019` foram removidos da rastreabilidade canônica. Isso não remove nem renumera as funcionalidades correspondentes.

## Consolidação PostgreSQL pendente

Nenhuma das migrations foi aplicada e validada neste ambiente contra PostgreSQL real. Validação estática não equivale a validação integrada.

### Etapa 01 — `20260828170000_stage_01_foundation`

- Tabelas: `users`, `organizations`, `airports`, `memberships`, `airport_accesses`, `sessions`, `audit_logs`.
- Verificar: FKs, unicidades de Membership/acesso/códigos, índices de tenant/sessão/auditoria e cookie/sessão real.
- Trigger: `audit_logs_append_only`.
- Seed: usuário, Organization, Airport, Membership e acesso locais.
- Testes pendentes: migration deploy/status, autenticação real, troca de contexto, cross-tenant, expiração/revogação de sessão e Audit Log transacional.

### Etapa 02 — `20260828220000_stage_02_regulatory_engine`

- Tabelas: `regulatory_profiles`, `regulatory_sources`, `regulatory_requirements`, `applicability_rules`, `applicability_assessments`, `applicability_assessment_items`.
- Verificar: perfil ativo único, períodos, FKs compostas perfil/aeródromo e regra/requisito, versões e índices.
- Triggers: `applicability_assessments_immutable`, `applicability_assessment_items_immutable`.
- Seed: RBAC 153 EMD 11 para as sete seções autorizadas e regras iniciais.
- Testes pendentes: criação/ativação/supersession, assessment transacional, histórico, Audit Log e E2E autenticado do perfil.

### Etapa 03 — `20260829140000_stage_03_governance_authority`

- Tabelas: `regulatory_roles`, `regulatory_designations`, `regulatory_responsibilities`, `regulatory_authorities`, `regulatory_role_authorities`, `safety_committees`, `safety_committee_members`.
- Verificar: checks temporais/notificação/reporte, FKs compostas da CSO, índices, exclusividade e histórico.
- Triggers: `regulatory_designations_exclusive`, `regulatory_designations_history_immutable`, `safety_committees_no_delete`, `safety_committee_members_no_delete`.
- Seed: seis funções, autoridades estruturais/funcionais, responsabilidade mínima e mapeamentos.
- Testes pendentes: lifecycle de designações, supersession/revogação, prazo/evidência ANAC, Authority Service, CSO/composição, isolamento cross-tenant e Audit Log.

## Funcionalidades antecipadas

Nenhuma funcionalidade da Etapa 05 foi antecipada. `APPROVE_SAFETY_POLICY` existe e é consumida apenas pela Etapa 04; `APPROVE_AISO`, `ACCEPT_RISK`, `APPROVE_CHANGE` e `VALIDATE_AUDIT_CLOSURE` não existem no schema, seed ou serviços.

A CSO estrutural está implementada; reuniões, pautas, atas, decisões e acompanhamento são `FUTURE_SCOPE`. MOPS é apenas representável por campos de hierarquia/limites; não há módulo documental.

## Normalizações realizadas e inconsistências restantes

- `TRACEABILITY.md` agora distingue Fundação, Regulatory Engine, Governance and Authority e escopo futuro.
- Estados dependentes de PostgreSQL foram normalizados para `IMPLEMENTED_PENDING_EXTERNAL_VALIDATION`.
- RF-036 foi normalizado para `PARTIALLY_IMPLEMENTED` porque o avaliador multi-aeródromo ainda não é consumido por API, UI ou workflow de designação.
- RNFs confirmados passaram a possuir linhas individuais; RNF-015 a RNF-018 usam `PREPARED_NOT_ACTIVE`.
- RF-041, RF-042 e RNF-019 foram removidos como IDs canônicos e substituídos por uma seção sem numeração.

Inconsistência documental restante: os nomes e descrições individuais oficiais de RF-019 a RF-030 não constam dos documentos versionados fornecidos. Os IDs permanecem corretamente como `FUTURE_SCOPE`, sem inventar seus nomes.

## Condição após a Etapa 04

**STAGE_04_IMPLEMENTED_WITH_KNOWN_EXTERNAL_DEPENDENCY**.

Disponível:

- Gestor Responsável modelado e serviço para localizar designação ativa;
- Regulatory Authority Matrix e Authority Service;
- RegulatoryProfile e Regulatory Applicability Engine;
- Audit Log server-side;
- multi-tenancy e autorização central;
- padrões de versionamento temporal para perfil/regra;
- Local Preview seguro e read-only.

Faltante ou pendente:

- validação das quatro migrations, seed, triggers e fluxos autenticados em PostgreSQL real;
- confirmação integrada da política, objetivos, autoridade, Audit Log e Local Preview com PostgreSQL;
- confirmação nominal da MMRF para RF-019 a RF-030.

Riscos antes da Etapa 05: construir sobre constraints nunca executadas; ampliar escopo regulamentar sem confirmação nominal da MMRF; e iniciar módulos dependentes de dados integrados ainda não validados em PostgreSQL real.
