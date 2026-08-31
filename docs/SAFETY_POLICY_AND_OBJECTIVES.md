# Política e Objetivos da Segurança Operacional

## Escopo da Etapa 04

Esta implementação oferece um agregado controlado por aeródromo para Política de Segurança Operacional, seus objetivos gerenciais, aprovação por autoridade competente, vigência, revisão, comunicação e histórico. Ela não declara conformidade operacional global com o SGSO e não implementa perigos, GRSO, matriz de risco, AISO, SPI, SPT, ALoSP, auditorias, MOC, PISOA, promoção ou treinamento.

## Base normativa e semântica

A estrutura foi orientada pelo RBAC 153 e pela IS 153.51-001A, especialmente pelos elementos de política e objetivos: compromisso formal, recursos, responsabilidades, requisitos aplicáveis, melhoria contínua, princípios de relato, comunicação e revisão. O produto diferencia obrigação regulamentar (`OBR`), forma de cumprimento (`FC`), recomendação (`REC`) e validação estrutural interna (`COMPLETE`, `INCOMPLETE`, `REQUIRES_REVIEW`). Uma classificação estrutural não equivale a aprovação da ANAC nem a declaração integral de conformidade.

## Modelo controlado

- `SafetyPolicy`: raiz única por aeródromo.
- `SafetyPolicyVersion`: conteúdo e versão imutáveis após aprovação.
- `SafetyPolicyApproval`: evidência humana do aprovador, designação, autoridade, instante e justificativa.
- `SafetyPolicyReview`: revisão periódica ou motivada, separada de alteração de conteúdo.
- `SafetyPolicyCommunication`: público, método, momento e referência obrigatória de evidência.
- `SafetyObjective`: objetivo gerencial ligado à versão ativa, responsável, prazo, critério de medição e resultado observado.

Estados da política: `DRAFT → UNDER_REVIEW → APPROVED → ACTIVE → SUPERSEDED`, com `ARCHIVED` apenas para versões não ativas ou históricas. Uma mudança de conteúdo em versão controlada exige nova versão. Uma nova ativação encerra e sucede a versão anteriormente ativa; o banco também limita a uma versão ativa por aeródromo.

Estados de objetivo: `DRAFT`, `ACTIVE`, `ACHIEVED`, `NOT_ACHIEVED`, `CANCELLED`, `SUPERSEDED`. `ACHIEVED` e `NOT_ACHIEVED` exigem resultado observado. Objetivo não é SPI, SPT ou ALoSP.

## Autoridade e segurança

A permissão administrativa `policy:manage` permite conduzir o workflow, mas não aprovar. A aprovação exige decisão `ALLOWED` do Authority Service para `APPROVE_SAFETY_POLICY`, concedida somente a uma designação vigente de `ACCOUNTABLE_MANAGER` no mesmo aeródromo. Organization, Airport, Membership e IDs do recurso são validados no backend.

Todas as mutações geram Audit Log server-side com usuário, organização, aeródromo, entidade e metadata pertinente. Não há endpoint de exclusão; a migration impede hard delete e protege o conteúdo aprovado. O Local Preview apresenta dados demonstrativos read-only e bloqueia mutações na rota e no serviço antes de Prisma e Audit Log.

## Validação pendente

A migration `20260831120000_stage_04_safety_policy_objectives` foi validada estaticamente, mas ainda precisa ser aplicada e testada em PostgreSQL real conforme `docs/POSTGRES_VALIDATION.md`.
