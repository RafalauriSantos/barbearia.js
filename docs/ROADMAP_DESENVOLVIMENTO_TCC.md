# Roadmap de Desenvolvimento - TCC

Este roadmap e o caminho principal para evoluir o projeto de uma agenda local funcional para um MVP SaaS utilizavel por uma barbearia real.

Data-base: 2026-05-19.

## Objetivo do Produto

Construir um SaaS simples para barbearias, com:

- landing page publica;
- cadastro e login de usuarios;
- separacao de dados por barbearia;
- agenda operacional diaria;
- cadastro de servicos, produtos, equipe e despesas;
- resumo financeiro basico;
- fluxo minimo de convite para barbeiros;
- base pronta para deploy e demonstracao.

## Regra de Direcao

O produto deve ser desenvolvido na ordem que reduz risco:

1. primeiro garantir que o sistema roda;
2. depois fechar autenticacao e tenant;
3. depois proteger dados;
4. depois melhorar experiencia de uso;
5. por ultimo polir landing, testes, deploy e acabamento.

Nao devemos investir pesado em telas novas antes de resolver login, tenant e isolamento de dados.

## Estado Atual Resumido

O projeto ja tem:

- backend Fastify em `backend/`;
- frontend Vite/React em `frontend/`;
- Supabase/Postgres via Knex e repositorios;
- rotas de agenda, servicos, produtos, despesas, financeiro, perfil, barbeiros, convites e auth;
- frontend com rotas protegidas usando `AuthContext`;
- `apiClient` enviando `Authorization: Bearer <token>` quando existe token local;
- scripts de raiz:
  - `rodar-tudo.cmd`;
  - `ver-portas.cmd`;
  - `testar-tudo.cmd`;
- layout principal ja direcionado para agenda operacional;
- contrato principal entre frontend e backend ja parcialmente alinhado.

Pontos ainda criticos:

- validar auth de ponta a ponta em runtime;
- persistir e tratar refresh token de forma mais robusta;
- resolver tenant/barbearia por usuario, em vez de depender do `DEFAULT_BARBEARIA_ID`;
- reproteger rotas sensiveis sem quebrar a UI;
- garantir que cadastro cria ou associa uma barbearia;
- validar fluxo completo no navegador.

## Marco 0 - Baseline Local Confiavel

Objetivo: ter certeza de que qualquer mudanca parte de uma base funcionando.

### Tarefas

- Rodar status do Git antes de cada bloco grande.
- Subir backend e frontend pelo script de raiz.
- Conferir portas `3000` e `5173`.
- Rodar verificacao rapida dos endpoints principais.
- Abrir o app no navegador e validar a tela principal.

### Comandos

```powershell
git status --short
.\rodar-tudo.cmd
.\ver-portas.cmd
.\testar-tudo.cmd
```

### Criterios de Aceite

- Backend responde em `http://localhost:3000/health`.
- Frontend abre em `http://localhost:5173`.
- `testar-tudo.cmd` nao mostra falha critica.
- Agenda, servicos, despesas e financeiro nao quebram no navegador.

### Resultado Esperado

Base local pronta para desenvolvimento incremental.

## Marco 1 - Auth Real de Ponta a Ponta

Objetivo: o usuario deve conseguir se cadastrar, confirmar email quando aplicavel, logar e acessar `/app` com token valido.

### Backend

- Revisar `backend/src/routes/auth.js`.
- Revisar `backend/src/controllers/authController.js`.
- Revisar `backend/src/services/authService.js`.
- Garantir que `POST /auth/register` cria usuario corretamente.
- Garantir que `POST /auth/login` retorna:
  - `accessToken`;
  - `refreshToken`;
  - `user`.
- Garantir que `GET /auth/me` funciona com `Authorization`.
- Decidir comportamento de verificacao de email em dev:
  - manter obrigatoria com `verificationUrl` em dev; ou
  - permitir login automatico em ambiente local.

### Frontend

- Revisar `frontend/src/context/AuthContext.jsx`.
- Revisar `frontend/src/lib/api/client.js`.
- Revisar `frontend/src/pages/LoginPage.jsx`.
- Garantir que login:
  - chama `/auth/login`;
  - salva `accessToken`;
  - carrega `/auth/me`;
  - redireciona para `/app`;
  - mostra erro claro quando credenciais ou email nao verificado falham.
- Garantir que logout limpa sessao local.

### Criterios de Aceite

- Usuario cadastrado consegue concluir o fluxo ate `/app`.
- `/auth/me` retorna usuario logado no navegador.
- Recarregar a pagina nao deixa a UI em estado quebrado.
- Erros de login aparecem na tela sem travar a aplicacao.

### Testes Minimos

```powershell
curl -X POST http://localhost:3000/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"teste@example.com\",\"password\":\"senha123\"}"

curl -X POST http://localhost:3000/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"teste@example.com\",\"password\":\"senha123\"}"
```

## Marco 2 - Refresh Token e Sessao Estavel

Objetivo: a sessao nao deve depender apenas de um access token curto salvo no frontend.

### Tarefas

- Criar ou confirmar tabela de refresh tokens.
- Salvar hash do refresh token no banco.
- Rotacionar refresh token quando usado.
- Invalidar refresh token antigo apos rotacao.
- Implementar logout de servidor quando fizer sentido.
- Ajustar `apiClient` para tentar refresh em `401` antes de derrubar a sessao.
- Definir onde o refresh token fica no MVP:
  - opcao simples: `localStorage`, mais rapido para TCC;
  - opcao melhor: cookie `HttpOnly`, mais correto para producao.

### Decisao Recomendada Para MVP

Usar abordagem simples primeiro, desde que documentada:

- `accessToken` em memoria/local storage;
- `refreshToken` em local storage temporariamente;
- criar issue futura para migrar refresh token para cookie `HttpOnly`.

Essa escolha acelera o TCC sem bloquear o desenvolvimento.

### Criterios de Aceite

- Quando o access token expira, o frontend consegue renovar.
- Quando refresh token e invalido, usuario volta para `/login`.
- O backend nao aceita refresh token revogado.

## Marco 3 - Tenant por Usuario

Objetivo: cada usuario deve trabalhar dentro da propria barbearia.

### Problema Atual

O projeto ainda depende de `DEFAULT_BARBEARIA_ID` e opcionalmente `DEFAULT_BARBEIRO_ID` para parte do fluxo. Isso ajuda no desenvolvimento, mas nao e suficiente para SaaS.

### Backend

- Garantir que usuario tem vinculo claro com `barbearia_id`.
- No cadastro inicial, criar uma barbearia padrao para o usuario owner.
- Salvar o `barbearia_id` no usuario ou em tabela de associacao.
- Fazer `auth` carregar contexto no `request.user`, incluindo:
  - `userId`;
  - `barbearia_id`;
  - `barbeiro_id`;
  - `role`.
- Ajustar services/repositories para usar tenant vindo da sessao.
- Manter `DEFAULT_BARBEARIA_ID` apenas como fallback controlado de desenvolvimento.

### Frontend

- Exibir nome da barbearia/perfil vindo do usuario logado.
- Nao depender de dados globais.
- Tratar usuario sem barbearia com tela simples de onboarding.

### Criterios de Aceite

- Usuario A nao enxerga dados do usuario B.
- Criar servico, despesa ou agendamento salva com a barbearia do usuario logado.
- Remover `DEFAULT_BARBEARIA_ID` nao quebra o fluxo principal em ambiente configurado.

## Marco 4 - Reproteger Rotas Sensíveis

Objetivo: proteger dados reais sem voltar a quebrar a tela da agenda.

### Rotas a Proteger

- `/agendamentos`;
- `/expenses`;
- `/products`;
- `/services`;
- `/profile`;
- `/financial`;
- `/barbers`;
- `/invites`;

### Ordem Recomendada

1. Proteger `/auth/me` ja existente.
2. Proteger escrita primeiro:
   - `POST`;
   - `PUT`;
   - `DELETE`.
3. Proteger leitura depois:
   - `GET`.
4. Validar UI apos cada grupo.

### Criterios de Aceite

- Sem token, API responde `401`.
- Com token valido, UI continua funcionando.
- Payloads continuam compativeis com o frontend atual.
- Nenhuma tela principal fica em loop de login.

## Marco 5 - Onboarding e Primeira Experiencia

Objetivo: um novo dono de barbearia deve entender o produto e chegar rapido na agenda.

### Fluxo Alvo

1. Usuario acessa landing.
2. Clica em CTA.
3. Cria conta.
4. Confirma email ou entra em modo dev.
5. Informa nome da barbearia.
6. Cai na agenda vazia.
7. Cria primeiro servico.
8. Cria primeiro agendamento.

### Telas

- Landing publica em `/welcome` ou `/`.
- Login em `/login`.
- Cadastro integrado ao login ou rota dedicada `/register`.
- Onboarding simples se barbearia ainda nao existir.
- App principal em `/app`.

### Criterios de Aceite

- Pessoa nova consegue se cadastrar sem precisar mexer no banco.
- Depois do cadastro, existe uma barbearia associada.
- A agenda abre pronta para uso.
- O CTA da landing leva para o cadastro/login correto.

## Marco 6 - Agenda Operacional MVP

Objetivo: a tela principal deve ser util no dia a dia da barbearia.

### Prioridades

- Lista de agendamentos do dia.
- Filtro por barbeiro.
- Criar agendamento rapido.
- Editar status.
- Excluir/cancelar.
- Resumo do dia.
- Entrada de gestao mais pesada apenas em modal/sheet.

### Evitar Agora

- Dashboard administrativo pesado.
- Graficos demais.
- Configuracoes espalhadas na tela principal.
- Formularios grandes no canvas principal.

### Criterios de Aceite

- Em mobile, a agenda e a primeira coisa visivel.
- Criar/editar agendamento nao exige navegar por muitas telas.
- Gestao de equipe nao polui a tela principal.
- Financeiro do dia faz sentido com os agendamentos e despesas.

## Marco 7 - Catalogo, Equipe e Financeiro

Objetivo: fechar as areas de suporte ao uso real.

### Servicos e Produtos

- Criar, editar, listar e remover.
- Validar preco.
- Garantir vinculo com barbearia.

### Equipe

- Listar barbeiros.
- Convidar barbeiro.
- Aceitar convite.
- Vincular barbeiro ao usuario.
- Definir papel simples:
  - owner/admin;
  - barber.

### Financeiro

- Resumo por dia.
- Despesas por data.
- Total de agendamentos pagos.
- Lucro estimado.
- Validar calculo contra dados reais da API.

### Criterios de Aceite

- Dono consegue configurar servicos e equipe.
- Barbeiro convidado consegue acessar.
- Financeiro bate com agenda e despesas.

## Marco 8 - Qualidade, Testes e Regressao

Objetivo: reduzir risco antes de demonstrar ou publicar.

### Backend

- Testes de auth:
  - register;
  - login;
  - me;
  - refresh;
  - token invalido.
- Testes de tenant:
  - usuario so acessa propria barbearia;
  - criacao grava `barbearia_id` correto.
- Testes de dominio:
  - servicos;
  - produtos;
  - despesas;
  - agendamentos;
  - financeiro.

### Frontend

- Testes de validacao.
- Testes de renderizacao dos estados:
  - loading;
  - vazio;
  - erro;
  - sucesso.
- E2E minimo:
  - cadastro;
  - login;
  - criar servico;
  - criar agendamento;
  - ver financeiro.

### Comandos

```powershell
cd backend
npm test

cd ..\frontend
npm test
npm run build
```

### Criterios de Aceite

- Build do frontend passa.
- Testes principais passam.
- Fluxo de navegador passa manualmente.
- Erros conhecidos ficam documentados.

## Marco 9 - Deploy e Demonstracao

Objetivo: deixar o sistema pronto para apresentacao e uso inicial.

### Tarefas

- Conferir variaveis de ambiente obrigatorias.
- Definir ambiente de deploy:
  - backend;
  - frontend;
  - Supabase;
  - dominio, se houver.
- Garantir CORS correto.
- Configurar `APP_URL`.
- Configurar SMTP ou fallback de email para demo.
- Rodar smoke test em producao/staging.
- Preparar roteiro de apresentacao.

### Variaveis Criticas

- `SUPABASE_URL`;
- `SUPABASE_SERVICE_KEY`;
- `JWT_SECRET`;
- `APP_URL`;
- `CORS_ORIGIN`;
- `DEFAULT_BARBEARIA_ID` apenas se ainda for necessario em dev;
- credenciais SMTP, se email real for usado.

### Criterios de Aceite

- Landing abre.
- Cadastro/login funcionam.
- App abre autenticado.
- Criar agendamento persiste no Supabase.
- Dados nao vazam entre usuarios.

## Ordem de Execucao Recomendada

### Sprint 1 - Base de Auth e Login

- Validar baseline local.
- Corrigir fluxo register/login/me.
- Ajustar mensagens de erro no frontend.
- Confirmar redirecionamento para `/app`.
- Documentar comportamento de verificacao de email.

Entrega: usuario consegue entrar no app com token valido.

### Sprint 2 - Tenant e Dados Isolados

- Criar ou reforcar vinculo usuario-barbearia.
- Fazer cadastro criar barbearia.
- Carregar tenant no middleware de auth.
- Aplicar tenant em agenda, servicos, produtos e despesas.

Entrega: cada usuario tem seus proprios dados.

### Sprint 3 - Rotas Protegidas Sem Quebrar UI

- Reproteger escrita.
- Reproteger leitura.
- Ajustar chamadas do frontend que falharem.
- Testar fluxo inteiro no navegador.

Entrega: API protegida e frontend funcional.

### Sprint 4 - Onboarding e UX Principal

- Ajustar landing/CTA.
- Criar ou melhorar cadastro.
- Criar tela simples de primeira configuracao.
- Refinar agenda operacional.

Entrega: usuario novo entende o caminho e usa a agenda.

### Sprint 5 - Equipe, Convites e Financeiro

- Validar convites.
- Ajustar aceite de convite.
- Revisar permissoes basicas.
- Validar financeiro com dados reais.

Entrega: fluxo minimo de barbearia com equipe.

### Sprint 6 - Testes, Deploy e Apresentacao

- Cobrir auth/tenant com testes.
- Rodar build.
- Corrigir regressao visual ou funcional.
- Preparar deploy.
- Escrever roteiro de demo.

Entrega: MVP demonstravel com seguranca basica.

## Checklist de Trabalho Para Cada Bloco

Antes de codar:

- `git status --short`;
- ler arquivos diretamente envolvidos;
- confirmar comportamento atual;
- definir uma entrega pequena.

Durante:

- alterar poucos arquivos por vez;
- manter compatibilidade com contratos atuais;
- validar rota ou tela afetada;
- evitar refatoracao fora de escopo.

Depois:

- rodar teste/build possivel;
- testar no navegador quando for UI;
- atualizar este roadmap se a direcao mudar;
- fazer commit com mensagem clara.

## Proximo Passo Imediato

Comecar pelo Marco 1.

Primeira tarefa pratica:

1. rodar `.\testar-tudo.cmd`;
2. testar manualmente `/auth/register`, `/auth/login` e `/auth/me`;
3. abrir o fluxo de login no navegador;
4. corrigir o primeiro bloqueador real encontrado;
5. so depois iniciar tenant por usuario.

Esse caminho evita construir em cima de uma sessao instavel.
