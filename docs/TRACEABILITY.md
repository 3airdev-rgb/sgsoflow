# Rastreabilidade MMRF — Etapas 02 e 03

| MMRF ID | Implementação | Componente / entidade | Teste | Status |
|---|---|---|---|---|
| RF-001 | Perfil regulatório por aeródromo | `RegulatoryProfile`, `regulatory/service.ts` | T07, T08 | IMPLEMENTED |
| RF-002 | Motor de aplicabilidade central | `regulatory/engine.ts` | T01–T06, T10, T11, cenários A–G | IMPLEMENTED |
| RF-003 | Catálogo de fonte e requisitos | `RegulatorySource`, `RegulatoryRequirement`, seed | validação Prisma e seed PostgreSQL pendente | IMPLEMENTED / POSTGRES PENDING |
| RF-004 | Regras versionadas e condições seguras | `ApplicabilityRule`, `catalog-service.ts` | condição insegura, T09, T11 | IMPLEMENTED |
| RF-005 | Avaliação e itens históricos | `ApplicabilityAssessment`, `ApplicabilityAssessmentItem` | T09, T10, T11, T16 | IMPLEMENTED |
| RF-008 | Explicabilidade por requisito e regime | `AssessmentItemResult`, interface regulatória | T05, T06, rationales A–G | IMPLEMENTED |
| RF-009 | Versionamento temporal e preservação | `profile-versioning.ts`, constraints e triggers | T07–T09, T16 | IMPLEMENTED |
| RF-010 | Identificação SGSO/PGSO/aspectos críticos/revisão | `evaluateRegulatoryApplicability` | T01–T04, precedência A–G, uso privativo | IMPLEMENTED |
| RF-184 | Autorização administrativa regulatória | policies `regulatory:*` | T12 | IMPLEMENTED |
| RF-185 | Isolamento Organization → Airport → perfil/assessment | policies e consultas filtradas | T13–T15 | IMPLEMENTED |
| RNF-001 | Autenticação obrigatória | Route Handlers e página privada | suíte Etapa 01 | IMPLEMENTED |
| RNF-002 / RNF-003 / RNF-004 | Autorização e multi-tenancy backend | `authorization/policies.ts`, serviços | T12–T15 | IMPLEMENTED |
| RNF-006 | Auditabilidade | `recordAuditEvent`, triggers | T17 | IMPLEMENTED |
| RNF-010 / RNF-011 / RNF-014 | Integridade, histórico e rastreabilidade | FKs, índices, versões, metadados | T07–T11, T16 | IMPLEMENTED / POSTGRES PENDING |
| RF-006 | Estrutura gerencial do operador por aeródromo | `RegulatoryRole`, `RegulatoryDesignation`, `governance/service.ts` | GOV-05–GOV-08 | IMPLEMENTED / POSTGRES PENDING |
| RF-007 | Responsabilidades e autoridade separadas da role técnica | `RegulatoryResponsibility`, `RegulatoryAuthority`, `RegulatoryRoleAuthority` | GOV-01, GOV-02, GOV-18 | IMPLEMENTED / POSTGRES PENDING |
| RF-031 | Catálogo de funções regulamentares | `RegulatoryRole`, seed controlado, matriz na interface | GOV-01, GOV-08 | IMPLEMENTED |
| RF-032 | Designações com vigência e estados | `RegulatoryDesignation`, rotas de criar/ativar/revogar | GOV-03–GOV-07 | IMPLEMENTED / POSTGRES PENDING |
| RF-033 | Gestor Responsável exclusivo e histórico | `ACCOUNTABLE_MANAGER`, serviço de ativação, trigger de exclusividade | GOV-02, GOV-05–GOV-07 | IMPLEMENTED / POSTGRES PENDING |
| RF-034 | Responsável vigente pelo SGSO | `SAFETY_MANAGER`, `findActiveDesignation` | GOV-08 | IMPLEMENTED |
| RF-035 | Gestores operacionais | `OPERATIONS_MANAGER`, `MAINTENANCE_MANAGER`, `EMERGENCY_RESPONSE_MANAGER` | interface e catálogo seedado | IMPLEMENTED / POSTGRES PENDING |
| RF-036 | Regras centralizadas de acumulação por classe, operação e multi-aeródromo — RBAC 153.15(b)/(e), Apêndice A | `evaluateAccumulation`, `evaluateStaffingCoverage`, `evaluateMultiAirportAccumulation` | GOV-19, GOV-AUD-01–08 | IMPLEMENTED |
| RF-037 | Comissão de Segurança Operacional aplicável ao SGSO — RBAC 153.53(c)(2) | `SafetyCommittee`, cálculo server-side e página Estrutura Organizacional | GOV-10, GOV-16, GOV-AUD-12 | IMPLEMENTED / POSTGRES PENDING |
| RF-038 | Membros da CSO com vigência e aderência às funções 153.15(a) | `SafetyCommitteeMember`, `evaluateSafetyCommitteeComposition` | GOV-11, GOV-17, GOV-AUD-13–15 | IMPLEMENTED / POSTGRES PENDING |
| RF-039 | Regulatory Authority Matrix temporal | `RegulatoryRoleAuthority`, `canPerformRegulatoryAction` | GOV-01–GOV-04, GOV-18, GOV-20 | IMPLEMENTED / POSTGRES PENDING |
| RF-040 | Preservação histórica e Audit Log de governança | triggers, `recordAuditEvent`, serviços transacionais | GOV-06, GOV-07, GOV-13, GOV-14 | IMPLEMENTED / POSTGRES PENDING |
| RNF-001 | Autenticação obrigatória nas rotas de governança | `requireSession` | suíte existente e GOV-15–GOV-17 | IMPLEMENTED |
| RNF-002 / RNF-003 / RNF-004 | Autorização e multi-tenancy de governança | `governance:read/manage`, escopo Organization/Airport e FKs compostas | GOV-09–GOV-12, GOV-20 | IMPLEMENTED |
| RNF-006 | Auditabilidade server-side | eventos de catálogo, designação, CSO e membros | GOV-13, GOV-14 | IMPLEMENTED / POSTGRES PENDING |
| RNF-010 / RNF-011 | Integridade, vigência e histórico | checks, índices, triggers e ausência de hard delete | GOV-03–GOV-07 | IMPLEMENTED / POSTGRES PENDING |
| RNF-015–RNF-018 | Princípio de autoridade futura sem IA | decisão trivalente com rationale e sem equivalência com role técnica | GOV-01, GOV-18, GOV-19 | PRINCIPLE IMPLEMENTED; IA OUT OF SCOPE |
| RF-041 | Ato de designação e comunicação à ANAC em 30 dias — RBAC 153.15(c)/(d) | campos de designação, prazo, estados e rota de evidência | GOV-AUD-09–11, GOV-AUD-16 | IMPLEMENTED / POSTGRES PENDING |
| RF-042 | Prerrogativas do responsável pelo SGSO — RBAC 153.25(b)(1)/(2) | autoridades `DIRECT_ACCESS_ACCOUNTABLE_MANAGER` e `ACCESS_REQUIRED_SAFETY_DATA` | seed e matriz de autoridade | IMPLEMENTED / POSTGRES PENDING |
| RNF-019 | Mutações normativas bloqueadas no Local Preview | guardas de rota e serviço | GOV-AUD-16–17 | IMPLEMENTED |

`POSTGRES PENDING` significa que a estrutura foi validada estaticamente, mas a migration ainda não foi aplicada em uma instância PostgreSQL real.

## Dispositivos normativos auditados na Etapa 03

| Dispositivo | Representação | Estado semântico |
|---|---|---|
| RBAC 153.15(a)(1)–(5) | catálogo `RegulatoryRole` com `sourceReference` individual | OBR conforme aplicabilidade do Apêndice A |
| RBAC 153.15(b) | motor de acumulação por classe/operação | `PROHIBITED`, `ALLOWED`, `NOT_REQUIRED` ou `RECOMMENDATION` |
| RBAC 153.15(c) | hierarquia, correspondência de função e limites em `RegulatoryDesignation`; MOPS fora do escopo | OBR representável; documento não implementado |
| RBAC 153.15(d) e (d)(1) | ato, data, vigência, referência, prazo de 30 dias e evidência humana de envio | OBR; nunca envio automático |
| RBAC 153.15(e) | avaliação multi-aeródromo do mesmo operador | livre acumulação ou REC, conforme classe |
| RBAC 153.15(f) | elegibilidade/habilitação permanece requisito documental não inferido | `REQUIRES_REVIEW` até haver evidência adequada |
| RBAC 153.23 e 153.53(b) | `ACCOUNTABLE_MANAGER`, responsabilidade executiva e autoridade derivada de designação | OBR estrutural; workflows futuros fora do escopo |
| RBAC 153.25 | `SAFETY_MANAGER`, acesso direto ao Gestor Responsável e aos dados necessários | autoridade funcional, nunca `SystemRole` |
| RBAC 153.27, 153.29 e 153.31 | funções de Operações, Manutenção e Resposta à Emergência | catálogo rastreável |
| RBAC 153.53(c) e IS 153.51-001A | aplicabilidade e composição da CSO | `REQUIRED`, `NOT_REQUIRED` ou `REQUIRES_REVIEW`; estrutura separada de conformidade global |
