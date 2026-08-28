# Arquitetura da Etapa 01

## Modelo e isolamento

`User` não possui tenant fixo. `Membership` liga usuário e organização com role de sistema; `AirportAccess` concede acesso explícito a um aeródromo e pode ter role própria. O aeródromo sempre pertence a exatamente uma organização. Essa composição suporta múltiplas organizações e acessos parciais por usuário sem misturar função técnica de acesso com futura autoridade regulamentar.

O fluxo protegido é: cookie opaco → sessão válida → usuário ativo → grants ativos → policy central → consulta filtrada por tenant. IDs recebidos pela API são sempre dados não confiáveis. A seleção de contexto repete as policies no backend, persiste em `Session` e registra o evento na mesma transação.

## Camadas

- Apresentação: App Router e componentes React.
- Transporte: Route Handlers validam entradas e convertem erros para contrato HTTP uniforme.
- Aplicação: serviços de autenticação, contexto e auditoria.
- Autorização: policies reutilizáveis e mapa central role → permission.
- Persistência: Prisma/PostgreSQL com constraints defensivas.

Erros previstos usam códigos `VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409) e `INTERNAL_ERROR` (500). O último não expõe stack ou dados internos.

## Decisões

1. Sessão opaca stateful permite revogação/logout imediato e futuro vínculo com fatores MFA.
2. O token de sessão nunca é persistido em claro.
3. Audit Log é append-only por ausência de APIs de mutação e trigger de banco.
4. Soft delete (`deletedAt`) existe nas entidades estruturantes; queries de segurança exigem registros ativos e não excluídos.
5. Roles regulamentares não foram modeladas; futura `Regulatory Authority Matrix` será uma camada separada do RBAC técnico.
6. O seed contém dados explicitamente identificados como locais, nunca como dados reais.

## Pontos de extensão

Os módulos futuros devem ficar isolados por domínio e depender das policies/contexto atuais. Toda tabela tenant-owned deverá carregar `organizationId` (e `airportId` quando pertinente), ter índices por escopo e ser consultada por repositórios que recebam contexto autorizado. Nenhum domínio futuro foi criado nesta etapa.

## Limitações conhecidas

- Não há MFA, convite/autocadastro, recuperação de senha ou provedor federado.
- Não há UI de administração de usuários, memberships ou roles; o seed habilita validação local.
- Rate limiting e proteção distribuída contra brute force dependem da infraestrutura de deploy.
- E2E de login autenticado requer PostgreSQL iniciado e seed aplicado.
