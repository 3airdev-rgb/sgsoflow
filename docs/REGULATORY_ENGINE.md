# Regulatory Applicability Engine

## Escopo e fonte

A versão `1.0.0` avalia somente a Subparte C do RBAC 153 EMD 11: seções 153.51, 153.53, 153.55, 153.57, 153.59, 153.63 e 153.73. A fonte conferida é o [RBAC 153 EMD 11 oficial da ANAC](https://pergamum.anac.gov.br/pergamum/vinculos/RBAC153EMD11.pdf), emitido em 27/05/2026, especialmente a seção 153.7 e o Apêndice A.

O motor não implementa processos de SGSO/PGSO, não atesta conformidade e não substitui decisão da ANAC.

## Entidades e separação

- `RegulatoryProfile`: snapshot versionado dos atributos regulatórios do aeródromo.
- `RegulatorySource`: identificação da autoridade e edição normativa.
- `RegulatoryRequirement`: dispositivo e resumo técnico, sem reprodução integral da norma.
- `ApplicabilityRule`: versão, período, condição JSON validada, resultado e justificativa.
- `ApplicabilityAssessment`: conclusão imutável, perfil usado, versão do motor e regime.
- `ApplicabilityAssessmentItem`: snapshot explicável por requisito e versão da regra.

Norma, regra configurável e histórico do aeródromo permanecem independentes. Uma regra nova gera versão nova; uma nova condição do aeródromo gera perfil e assessment novos.

## Fluxo

1. O backend valida sessão, Membership, Organization e Airport.
2. Um administrador cria uma versão `DRAFT` do perfil.
3. A ativação substitui transacionalmente o perfil anterior, encerrando sua vigência.
4. O serviço recupera somente regras e requisitos vigentes.
5. O motor valida e interpreta condições seguras, produz itens explicáveis e identifica um único regime.
6. Assessment, itens e Audit Log são gravados na mesma transação.

## Condições seguras

As regras usam árvores JSON com `all`, `any`, `not` e predicados `{ field, operator: "EQ", value }`. Os campos aceitos estão enumerados no código. Não há `eval`, funções, SQL ou acesso dinâmico a propriedades arbitrárias. Condição inválida ou atributo ausente produz `REVIEW_REQUIRED`.

## Regimes configurados

- SGSO: aeródromo de uso público detentor de Certificado Operacional de Aeroporto conforme RBAC 139.
- PGSO: aeródromo de uso público que opera RBAC 121 ou RBAC 135 regular, sem certificado e sem SGSO.
- Gerenciamento de aspectos críticos: aeródromo público sem SGSO/PGSO, sem certificado e sem operação regular RBAC 121/135.
- Revisão necessária: dados ausentes, condição inválida, nenhum regime único ou conflito entre regras.

A classe, isoladamente, nunca determina o regime. O perfil a registra porque ela é parte da classificação do RBAC 153 e será necessária para aplicabilidades futuras.

SGSO tem precedência: a certificação RBAC 139 determina SGSO mesmo quando também há operação RBAC 121 ou RBAC 135 regular. Para aeródromo de uso privativo, os itens avaliados da Subparte C retornam `NOT_APPLICABLE`, conforme o Apêndice A.

## Regime exigido e situação declarada

`hasSGSO` e `hasPGSO` registram a situação declarada pelo operador; não determinam isoladamente o regime exigido. O certificado RBAC 139 e as condições operacionais configuradas determinam a aplicabilidade. Assim, um perfil certificado que declare possuir PGSO continua tendo SGSO como regime normativamente exigido.

O grupo PGSO completo também abrange 153.65, 153.67, 153.69 e 153.71. O modelo aceita esses requisitos sem alteração estrutural, mas o seed da Etapa 02 permanece deliberadamente limitado ao 153.63 para não ampliar o escopo aprovado.

## Explainability e histórico

Cada item preserva requisito, regra, versão da regra, status, justificativa e os atributos efetivamente considerados. O assessment preserva perfil, data, avaliador e `engineVersion`. Triggers PostgreSQL bloqueiam `UPDATE` e `DELETE` de assessments e itens. Não existe endpoint de mutação histórica.

## Alteração controlada

Uma nova norma deve ser criada como `RegulatorySource` distinta, com seus requisitos e datas. Uma mudança de lógica deve usar `createApplicabilityRuleVersion`; regras antigas não são sobrescritas. O serviço de catálogo exige `regulatory:rules:manage` (somente `SYSTEM_ADMIN`) e registra Audit Log.

## Limitações

- O seed é deliberadamente restrito às sete seções desta etapa.
- O campo `isMilitarySharedAerodrome` é uma salvaguarda decisória do produto, não uma declaração automática de isenção normativa. Quando verdadeiro, produz revisão humana para verificar as condições cumulativas do RBAC 153.5(a)(2): aeródromo compartilhado, operado pelo Comando da Aeronáutica e com sistema de segurança de voo implementado segundo as normas específicas daquele órgão.
- A migration e os fluxos integrados ainda precisam ser executados contra PostgreSQL real.
- Nenhum módulo funcional de SGSO ou PGSO foi implementado.
