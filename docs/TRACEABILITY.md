# Rastreabilidade canônica MMRF — pós-Etapa 03

Esta matriz usa somente IDs explicitamente confirmados nos escopos das Etapas 01–03. `IMPLEMENTED_PENDING_EXTERNAL_VALIDATION` significa que código e testes isolados existem, porém migrations, constraints, triggers, seed ou fluxo autenticado ainda aguardam PostgreSQL real.

## ETAPA 01 — Fundação

| MMRF_ID | Implementação fundacional | Componente | Teste | Status atual |
|---|---|---|---|---|
| RF-001 | Fundação para perfil por Airport | `Airport`, relações de tenant | autorização e validação | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-006 | Fundação Organization → Airport | `Organization`, `Airport`, `Membership`, `AirportAccess` | `authorization.test.ts` | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-009 | Campos temporais e padrão histórico | schema/migration da fundação | suíte Etapa 01 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-010 | Fundação para contexto regulatório por aeródromo | sessão e contexto ativo | contexto/autorização | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-031 | Roles técnicas separáveis das funções futuras | `SystemRole` | autorização | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-040 | Audit Log server-side append-only | `AuditLog`, `recordAuditEvent` | `auth-context-audit.test.ts` | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |

Os RFs acima recebem implementação funcional nas Etapas 02 ou 03 quando indicado na matriz as-built. A fundação não é contada como uma segunda ocorrência do requisito.

## ETAPA 02 — Regulatory Engine

| MMRF_ID | Implementação | Domain/Service | API/UI | Teste | Status |
|---|---|---|---|---|---|
| RF-001 | Perfil regulatório versionado por Airport | `RegulatoryProfile`, regulatory service | APIs e Perfil Regulatório | T07, T08, T12–T17 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-002 | Motor central de aplicabilidade | `regulatory/engine.ts` | consumido por assessment | T01–T06, T10–T11, A–G | IMPLEMENTED |
| RF-003 | Fontes e requisitos normativos | `RegulatorySource`, `RegulatoryRequirement`, seed | catálogo sem UI pública | testes indiretos | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-004 | Regras seguras e versionadas | `ApplicabilityRule`, catalog service | sem UI pública | condição insegura, T09, T11 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-005 | Assessments e itens históricos | assessment service | APIs e Perfil Regulatório | T09–T11, T16 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-008 | Explicabilidade | engine result/rationales | resposta e interface | T05, T06, A–G | IMPLEMENTED |
| RF-009 | Versionamento temporal | `profile-versioning.ts`, triggers | APIs de perfil | T07–T09, T16 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-010 | SGSO, PGSO, aspectos críticos e revisão | `evaluateRegulatoryApplicability` | assessment/UI | T01–T04, A–G, privativo | IMPLEMENTED |
| RF-184 | Autorização administrativa regulatória | policies + regulatory services | APIs privadas | T12 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-185 | Isolamento Organization/Airport/perfil | policies, queries, FKs compostas | APIs privadas | T13–T15 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |

## ETAPA 03 — Governance and Authority

| MMRF_ID | Implementação | Domain/Service | API/UI | Teste | Status |
|---|---|---|---|---|---|
| RF-006 | Estrutura gerencial por aeródromo | roles, designações, governance service | designations/Estrutura Organizacional | GOV-05–08 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-007 | Responsabilidades e autoridade separadas de role técnica | responsibilities, authorities, catalog service | matriz somente leitura | GOV-01, GOV-02, GOV-18 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-031 | Catálogo de funções regulamentares | `RegulatoryRole`, seed | Estrutura Organizacional | GOV-01, GOV-08 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-032 | Designações, ato, vigência e estados | `RegulatoryDesignation`, governance service | rotas de designação | GOV-03–07, GOV-AUD-09–11 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-033 | Gestor Responsável exclusivo e histórico | ativação/supersession + trigger | rotas de ativação/revogação | GOV-02, GOV-05–07 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-034 | Responsável vigente pelo SGSO | `SAFETY_MANAGER`, lookup de designação | workspace | GOV-08 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-035 | Gestores operacionais | catálogo e designações | workspace | suíte GOV | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-036 | Acumulação por classe e entre aeródromos | evaluators de acumulação/staffing/multi-airport | fluxo local usa acumulação; avaliador multi-airport sem API/UI/workflow | GOV-19, GOV-AUD-01–08 | PARTIALLY_IMPLEMENTED |
| RF-037 | Estrutura e aplicabilidade da CSO | `SafetyCommittee`, applicability evaluator | rotas CSO/workspace | GOV-10, GOV-16, GOV-AUD-12 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-038 | Membros e composição CSO | `SafetyCommitteeMember`, composition evaluator | rotas members/workspace | GOV-11, GOV-17, GOV-AUD-13–15 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-039 | Regulatory Authority Matrix temporal | role-authority mapping, Authority Service | matriz somente leitura; sem workflow futuro | GOV-01–04, GOV-18, GOV-20 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RF-040 | Histórico e Audit Log de governança | serviços transacionais + triggers | produzido pelas APIs | GOV-06, GOV-07, GOV-13, GOV-14 | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |

## FUTURE — Etapa 04+

### Implementação complementar da Etapa 04 (sem associação fictícia a RF)

Os nomes canônicos individuais de RF-019 a RF-030 continuam ausentes dos documentos versionados. Para preservar a MMRF, a implementação abaixo não inventa correspondência: `SafetyPolicy`, `SafetyPolicyVersion`, `SafetyPolicyApproval`, `SafetyPolicyReview`, `SafetyPolicyCommunication` e `SafetyObjective`; serviços/APIs/UI em `safety-policy`; autoridade `APPROVE_SAFETY_POLICY`; testes POL-01 a POL-22. Estado técnico: `IMPLEMENTED_PENDING_EXTERNAL_VALIDATION`. Os RF-019 a RF-030 abaixo só poderão mudar individualmente após confirmação nominal da matriz canônica.

| MMRF_ID | Etapa | Status | Observação |
|---|---|---|---|
| RF-019 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-020 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-021 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-022 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-023 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-024 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-025 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-026 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-027 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-028 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-029 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |
| RF-030 | 04 | FUTURE_SCOPE | definição nominal não consta dos documentos versionados; não implementado |

## Requisitos não funcionais confirmados

| RNF_ID | Implementação | Teste | Dependência externa | Status |
|---|---|---|---|---|
| RNF-001 | autenticação obrigatória, sessão opaca e cookie seguro | auth/context | sessão real PostgreSQL | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-002 | autorização backend por permission | authorization/regulatory/governance | grants reais PostgreSQL | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-003 | multi-tenancy Organization/Airport | cross-tenant T13–T15, GOV-09–12 | FKs/queries reais | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-004 | menor privilégio e IDs não confiáveis | policies e testes 403 | fluxo autenticado real | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-005 | campo de preparação para MFA | schema estático | implementação MFA futura | PARTIALLY_IMPLEMENTED |
| RNF-006 | Audit Log server-side append-only | auth audit, T17, GOV-13–14 | trigger/transação PostgreSQL | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-008 | tratamento padronizado de erros | rotas e error service | nenhuma | IMPLEMENTED |
| RNF-010 | integridade referencial | validação Prisma e testes isolados | migrations PostgreSQL | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-011 | imutabilidade e histórico | T07–T11, T16, GOV-03–07 | triggers PostgreSQL | IMPLEMENTED_PENDING_EXTERNAL_VALIDATION |
| RNF-014 | rastreabilidade técnica/normativa | documentos e testes nomeados | confirmação nominal futura da MMRF | PARTIALLY_IMPLEMENTED |
| RNF-015 | princípio de autoridade futura sem concessão por role técnica | GOV-01 | workflow futuro | PREPARED_NOT_ACTIVE |
| RNF-016 | decisão de autoridade explicável | GOV-18 | workflow futuro | PREPARED_NOT_ACTIVE |
| RNF-017 | autoridade condicionada à designação vigente | GOV-02–04, GOV-20 | workflow futuro | PREPARED_NOT_ACTIVE |
| RNF-018 | arquitetura de autoridade sem IA ativa | inspeção e suíte GOV | workflow futuro | PREPARED_NOT_ACTIVE |

## Implementações complementares sem RF canônico confirmado

Estas capacidades estão implementadas, mas não recebem número RF/RNF nesta matriz:

- controle do ato de designação, prazo de 30 dias e evidência humana da comunicação à ANAC;
- prerrogativas estruturais do Safety Manager: acesso ao Gestor Responsável e aos dados necessários;
- guardas adicionais do Local Preview para mutações de governança, notificação e composição da CSO.

Os identificadores anteriormente usados `RF-041`, `RF-042` e `RNF-019` foram removidos por ausência de comprovação canônica. As funcionalidades não foram removidas.

## Dispositivos normativos auditados

| Dispositivo | Representação | Estado semântico |
|---|---|---|
| RBAC 153.15(a)(1)–(5) | `RegulatoryRole.sourceReference` | obrigação conforme aplicabilidade |
| RBAC 153.15(b) e Apêndice A | motor de acumulação | proibição, permissão, não exigência ou recomendação |
| RBAC 153.15(c) | hierarquia e limites de designação | representável; MOPS não implementado |
| RBAC 153.15(d)/(d)(1) | ato, data, prazo e evidência | controle complementar sem RF confirmado |
| RBAC 153.15(e) | regra multi-aeródromo | domínio testado; integração incompleta |
| RBAC 153.15(f) | elegibilidade documental | revisão necessária sem evidência |
| RBAC 153.23 e 153.53(b) | Gestor Responsável | estrutura, sem workflow futuro |
| RBAC 153.25 | Safety Manager | autoridade funcional, nunca role técnica |
| RBAC 153.27, 153.29 e 153.31 | gestores operacionais | catálogo rastreável |
| RBAC 153.53(c) e IS 153.51-001A | CSO | aplicabilidade e composição estrutural |

Validação estática das três migrations está concluída. Aplicação, seed, constraints, triggers e testes integrados em PostgreSQL real permanecem pendentes, conforme `POSTGRES_VALIDATION.md` e `MMRF_IMPLEMENTATION_STATUS.md`.
