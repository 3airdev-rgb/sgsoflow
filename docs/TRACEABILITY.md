# Rastreabilidade MMRF — Etapa 02

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

`POSTGRES PENDING` significa que a estrutura foi validada estaticamente, mas a migration ainda não foi aplicada em uma instância PostgreSQL real.
