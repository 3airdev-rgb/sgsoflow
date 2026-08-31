# Governança organizacional e autoridade regulamentar

## Escopo

A Etapa 03 representa a estrutura gerencial do operador aeroportuário, suas designações regulamentares, responsabilidades, Comissão de Segurança Operacional (CSO) e matriz de autoridade. Ela não implementa Política de Segurança Operacional, GRSO, AISO, PESO, processos operacionais da CSO ou qualquer workflow decisório de etapas futuras.

## Três conceitos independentes

- `SystemRole` controla permissões técnicas no software (`SYSTEM_ADMIN`, `ORGANIZATION_ADMIN`, `AIRPORT_ADMIN`, `USER`).
- `RegulatoryRole` representa a função exercida no aeródromo (`ACCOUNTABLE_MANAGER`, `SAFETY_MANAGER`, gestores operacionais e `CSO_MEMBER`).
- `RegulatoryAuthority` representa uma autoridade estrutural que pode ser exercida somente quando mapeada a uma função e sustentada por designação ativa e vigente.

Uma role técnica nunca prova função ou autoridade regulamentar. Em particular, `SYSTEM_ADMIN` e `AIRPORT_ADMIN` não se tornam Gestor Responsável e não recebem autoridade regulamentar automaticamente.

## Designações, vigência e histórico

`RegulatoryDesignation` vincula pessoa, aeródromo, função e período. Seus estados são `DRAFT`, `ACTIVE`, `SUPERSEDED` e `REVOKED`. A criação não ativa automaticamente a designação. A ativação verifica tenant, elegibilidade da pessoa, multiplicidade, conflito temporal e acumulação.

Funções configuradas como `SINGLE`, incluindo `ACCOUNTABLE_MANAGER`, admitem apenas um titular ativo em períodos sobrepostos. Uma nova designação posterior encerra e marca a anterior como `SUPERSEDED`; designações históricas não são sobrescritas e nenhuma designação pode sofrer hard delete. Assim, consultas temporais podem responder quem exercia uma função em uma data específica.

## Acumulação — RBAC 153.15(b) e Apêndice A

A regra fica centralizada em `evaluateAccumulation()`, recebe o perfil regulatório vigente e nunca confunde recomendação com proibição. Para Classe I com operação regular RBAC 121 ou 135 há livre acumulação; sem essas operações a exigência é marcada como `NOT_REQUIRED`; dados incompletos resultam em `REQUIRES_REVIEW`. Nas Classes II, III e IV é `PROHIBITED` acumular Gestor Responsável e responsável pelo SGSO. Para Classe IV, as demais acumulações geram `RECOMMENDATION`, sem bloqueio. Na Classe III, menos de três profissionais distintos também gera recomendação, não obrigação. Entre aeródromos do mesmo operador, Classe I é livre e Classes II–IV recebem recomendação de não acumular, conforme RBAC 153.15(e) e Apêndice A.

## Ato de designação e comunicação à ANAC

Cada designação registra data do ato, referência, prerrogativas adicionais, limites de responsabilidade e relação de reporte. Para as funções do RBAC 153.15(a), o prazo de comunicação é calculado em 30 dias a partir do ato. O estado nasce `PENDING`, torna-se visualmente `OVERDUE` depois do prazo e só passa a `SUBMITTED` por ação humana explícita com data e evidência. O sistema não presume envio e audita o registro server-side. O MOPS permanece apenas como referência documental: esta etapa não o gera nem declara conformidade do manual.

## Funções e responsabilidades

O catálogo inicial contém exclusivamente:

- Gestor Responsável (`ACCOUNTABLE_MANAGER`);
- responsável pelo SGSO (`SAFETY_MANAGER`);
- gestores de Operações, Manutenção e Resposta à Emergência;
- membro da CSO.

`RegulatoryResponsibility` permite registrar responsabilidades técnicas mínimas por função, com referência de fonte opcional. O seed inclui apenas a responsabilidade estrutural de disponibilidade de recursos para o Gestor Responsável, sem reproduzir ou ampliar texto normativo.

## Regulatory Authority Matrix

`RegulatoryRoleAuthority` mapeia função para autoridade com vigência. O serviço `canPerformRegulatoryAction()` retorna `ALLOWED`, `DENIED` ou `REQUIRES_REVIEW`, sempre com justificativa. Uma decisão `ALLOWED` exige cumulativamente usuário, aeródromo, designação ativa, período vigente, função ativa, autoridade ativa e mapeamento vigente.

As autoridades iniciais são estruturais: visualizar governança/estrutura, gerenciar designações e gerenciar CSO. Autoridades futuras como aprovar Política, AISO ou aceitar risco não são usadas por nenhum workflow nesta etapa.

## CSO

`SafetyCommittee` registra aeródromo, nome, vigência, status e aplicabilidade (`REQUIRED`, `NOT_REQUIRED`, `REQUIRES_REVIEW`). A aplicabilidade não é escolhida pelo frontend: o backend a deriva do assessment vigente; regime SGSO resulta `REQUIRED`. A composição compara membros obrigatórios com titulares de designações ativas das responsabilidades aplicáveis do RBAC 153.15(a), enquanto membros adicionais são permitidos. Um papel sistêmico, inclusive `SYSTEM_ADMIN`, não satisfaz a composição sem designação regulamentar. O resultado `COMPLIANT_STRUCTURE` atesta somente a estrutura cadastral, não o funcionamento efetivo da comissão. Reuniões, atas e decisões operacionais permanecem fora do escopo.

## Multi-tenancy e autorização

Toda operação recupera a sessão e o contexto de autorização no backend. O acesso segue `User → Membership → Organization → Airport`. Pessoas designadas e membros precisam de Membership ativo e acesso ao mesmo aeródromo. IDs de designação, comitê e membro são sempre combinados com o `airportId` autorizado. FKs compostas impedem associar membro a CSO de outro aeródromo.

## Audit Log e integridade

Criação, ativação, supersession e revogação de designações; alterações de função/autoridade; criação/alteração de CSO; e inclusão/remoção de membro geram Audit Log server-side com usuário, Organization, Airport, entidade, ação e timestamp. O Audit Log continua append-only. Triggers impedem exclusão de designações, CSO e membros e protegem designações históricas.

## Local Preview

A página de Estrutura Organizacional possui dados explicitamente demonstrativos somente para visualização. Toda nova rota e todo serviço mutável chamam a política central antes de autorização, validação de IDs ou Prisma. A sessão demo não persiste, não consulta tenant real e não grava Audit Log.

## Limitações

- A migration e o seed aguardam validação em PostgreSQL real.
- Dados de perfil ou assessment inconclusivos retornam `REQUIRES_REVIEW`, sem inferência favorável.
- Não há workflow de aprovação, aceitação de risco, Política, AISO, GRSO ou processos operacionais da CSO.
