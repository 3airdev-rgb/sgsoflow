# Local Preview Mode

## Objetivo

Permitir a visualização local da interface aprovada após a Etapa 02 quando PostgreSQL não estiver disponível. O modo não substitui validação integrada, não representa ambiente operacional e não antecipa funcionalidades da Etapa 03.

## Ativação

O modo permanece desabilitado por padrão e exige cumulativamente:

```text
NODE_ENV=development
LOCAL_PREVIEW_MODE=true
LOCAL_PREVIEW_EMAIL=admin@example.local
LOCAL_PREVIEW_PASSWORD=<senha local de demonstração>
LOCAL_PREVIEW_SESSION_TOKEN=<token aleatório efêmero>
```

Não versione essas variáveis nem inclua o token em `.env.example`. O servidor deve receber o token somente pelo ambiente do processo local.

## Proteção contra produção

`isLocalPreviewEnabled()` exige `NODE_ENV === "development"` e `LOCAL_PREVIEW_MODE === "true"`. Definir apenas a flag em produção não ativa login, sessão, dados ou avisos de demonstração. A autenticação normal continua dependendo do PostgreSQL.

## Autenticação e dados

O login local é um bypass exclusivo de desenvolvimento e não consulta `User`, não cria `Session` persistida e não grava Audit Log. O cookie contém apenas o token efêmero configurado no processo. Usuário, Organization e Airport usam UUIDs reservados e nomes explícitos de visualização local. Perfis e assessments são apresentados vazios; nenhum resultado regulatório é fabricado.

## Read-only e isolamento do banco

`assertNotLocalPreviewMutation()` é a barreira central de backend. Rotas mutáveis aplicam a política imediatamente após recuperar a sessão e antes de validar IDs, construir contexto ou chamar serviços. Serviços de contexto, perfil, assessment, requisito e regra repetem a barreira antes do primeiro acesso Prisma.

As leituras disponíveis no modo local retornam somente o contexto simulado e coleções vazias. IDs fora do escopo são recusados antes do banco. Logout remove apenas o cookie local e não tenta revogar sessão persistida.

Uma sessão local não pode:

- trocar ou persistir contexto;
- criar, ativar ou superseder perfil;
- executar assessment;
- alterar requisito ou regra;
- gravar Audit Log;
- consultar ou modificar tenant real.

Tentativas mutáveis retornam `403 Forbidden` com mensagem não sensível.

## Limitações

- Não há persistência entre reinicializações.
- Formulários são apenas estruturais e suas ações ficam desabilitadas.
- O Regulatory Applicability Engine não é executado e nenhum resultado é mockado.
- Migrations, seed, integração autenticada e Audit Log real continuam pendentes de PostgreSQL.
- O modo permanece fora da baseline aprovada até revisão e decisão explícitas.

## Riscos conhecidos

O isolamento depende de manter toda nova rota ou serviço mutável coberto pela política central. Futuras mutações devem incluir teste de regressão que comprove `403` e ausência de acesso Prisma para sessão local.
