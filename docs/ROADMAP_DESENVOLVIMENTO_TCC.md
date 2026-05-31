# Roadmap de Desenvolvimento - TCC

Este arquivo e a fonte unica de verdade para acompanhar o app do TCC.

Data-base: 2026-05-31.

Este roadmap substitui o antigo checklist de frontend. Qualquer decisao de escopo, status de entrega, validacao, risco conhecido ou proximo passo deve ser atualizado aqui para evitar documentos conflitantes.

Roadmap no Notion:

- https://app.notion.com/p/Roadmap-Atual-do-App-TCC-3702113a244881d49159fc94250960a8

## 1. Objetivo do Produto

Construir um SaaS simples para barbearias, com:

- landing page publica;
- cadastro, verificacao de email e login de usuarios;
- separacao de dados por barbearia;
- agenda operacional diaria;
- cadastro de servicos, produtos, equipe e despesas;
- resumo financeiro basico;
- convite minimo para barbeiros;
- base pronta para demonstracao e deploy.

O produto deve continuar simples: primeiro a barbearia consegue operar a agenda e o caixa; depois entram melhorias de acabamento, automacao e escalabilidade.

## 2. Direcao Tecnica

Ordem de prioridade do projeto:

1. garantir que o sistema roda localmente;
2. fechar autenticacao e contexto de barbearia;
3. proteger dados sem quebrar a UI;
4. validar fluxos reais no navegador;
5. fechar testes, deploy e roteiro de apresentacao.

Regra de produto: a tela principal deve parecer uma agenda operacional rapida, nao um dashboard administrativo pesado.

Regra de engenharia: o schema real do Supabase/Postgres e o contrato atual do frontend sao a verdade. O backend deve adaptar e traduzir campos quando necessario, em vez de quebrar a interface.

## 3. Estado Atual Real

### Resumo

O projeto ja tem uma base full stack funcional:

- backend Fastify em `backend/`;
- frontend Vite/React em `frontend/`;
- Supabase/Postgres via Knex, migrations e repositorios;
- API REST em camadas: routes, controllers, services, repositories e validators;
- autenticacao propria com JWT;
- verificacao de email por codigo de 6 digitos;
- reset de senha por codigo;
- criacao de workspace/barbearia no cadastro de owner;
- contexto de usuario resolvendo `role`, `barbearia_id` e `barbeiro_id`;
- rotas protegidas para dados operacionais;
- frontend com `AuthContext`, rotas protegidas e `apiClient` centralizado;
- agenda, catalogo, equipe, despesas, financeiro, perfil, login, landing e convites;
- scripts de raiz para rodar, testar e validar;
- CI configurado em `.github/workflows/ci.yml`.
- frontend publicado na Vercel;
- backend publicado no Render;
- envio de email preparado para Brevo API, com SMTP apenas como fallback;
- UX ajustada para mobile/iOS Safari e cold start do Render Free.

### Validacao mais recente

Rodado em 2026-05-31:

- Backend `npm test`: passou.
- Frontend `npm run lint`: passou.
- Frontend `npm test`: passou, 8 arquivos de teste e 16 testes.
- Frontend `npm run build:artifact`: passou.
- Backend publicado `https://kurt-api.onrender.com/health`: respondeu `{"ok":true}`.
- Frontend publicado `https://kurt-barbearia.vercel.app`: carregou com titulo `KURT - Gestao para Barbearias`.

Historico ja validado:

- `.\scripts\check-all.ps1`: passou em 2026-05-30.
- `.\scripts\run-and-test-dev.ps1 -NoBrowser`: passou em 2026-05-30.
- Teste live completo por API passou para cadastro de owner, verificacao por codigo, login, sessao, perfil, servico, produto, despesa, agendamento, financeiro e isolamento entre dois usuarios.
- Validacao manual no navegador reportada pelo usuario passou para app local, cadastro pelo formulario, codigo, login, `/app`, agenda, catalogo, despesas, financeiro, perfil e equipe/convite.

Atualizacoes de 2026-05-31:

- Email: suporte a Brevo API por HTTPS, com testes automatizados.
- Render Free: timeout do frontend aumentado para 75s e warmup em `/health`.
- iOS Safari/mobile: viewport com `height=device-height`, `viewport-fit=cover`, safe area e remocao de alturas fixas problemáticas.
- Deploy: frontend e backend publicados em Vercel/Render.

### Worktree observado

Worktree estava limpo antes desta rodada de atualizacao documental.

## 4. Arquitetura Atual

### Backend

Stack:

- Node.js;
- Fastify;
- Knex;
- Postgres/Supabase;
- Zod;
- JWT;
- Argon2;
- Nodemailer;
- Brevo API para email transacional em producao gratuita.

Arquivos centrais:

- `backend/src/app.js`: monta Fastify, CORS, handler de erros, docs opcionais e rotas.
- `backend/src/server.js`: sobe o servidor.
- `backend/src/config/env.js`: valida variaveis de ambiente.
- `backend/src/config/database.js`: configuracao Knex.
- `backend/src/middleware/auth.js`: valida `Authorization: Bearer`.
- `backend/src/services/authService.js`: cadastro, login, verificacao, reset e usuario atual.
- `backend/src/repositories/authRepository.js`: cria usuario, cria workspace e resolve contexto.
- `backend/src/services/emailService.js`: envia codigos e convites por Brevo API ou SMTP fallback.

Rotas principais:

- `GET /health`;
- `GET /health/db`;
- `GET /auth/me`;
- `POST /auth/register`;
- `POST /auth/login`;
- `POST /auth/refresh`;
- `POST /auth/verify-code`;
- `POST /auth/resend-code`;
- `POST /auth/forgot-password`;
- `POST /auth/reset-password`;
- `GET/POST/PUT/DELETE /services`;
- `GET/POST/PUT/DELETE /products`;
- `GET/POST/PUT/DELETE /expenses`;
- `GET/POST/PATCH/PUT/DELETE /agendamentos`;
- `GET/PUT /profile`;
- `GET /financial/summary`;
- `GET/POST/PATCH /barbers`;
- `POST /barbers/:id/invite`;
- `GET /invites/:token`;
- `POST /invites/:token/accept`;
- somente dev/test: `DELETE /reset`;
- somente dev/test: `POST /test-email`.

Observacao de seguranca:

- `/services`, `/products`, `/expenses`, `/agendamentos`, `/profile`, `/financial` e `/barbers` estao protegidas por token.
- `/invites/:token` e `/invites/:token/accept` sao publicas por desenho, usando token de convite.
- `/reset` e `/test-email` nao sao registradas quando `NODE_ENV=production`.
- o controller de sistema tambem retorna `404` em producao como defesa adicional.

### Banco de Dados

Schema principal:

- `usuarios`;
- `barbearias`;
- `barbeiros`;
- `servicos`;
- `produtos`;
- `despesas`;
- `agendamentos`;
- `agendamento_servicos`;
- `agendamento_produtos`;
- `convites_barbeiros`;
- `email_verification_codes`;
- `password_reset_codes`;
- `shop_settings`;
- `pagamentos`.

Migrations existentes:

- `202604290001_initial_schema.js`;
- `202605170001_email_verification.js`;
- `202605170002_link_barbers_to_users.js`;
- `202605170003_barber_invites.js`;
- `202605210001_email_verification_codes.js`;
- `202605240001_password_reset_codes.js`;
- `202605290001_shop_settings.js`;
- `202605310001_barber_avatar.js`.

Decisao atual:

- O cadastro de owner cria usuario e workspace/barbearia.
- O contexto do usuario e resolvido por dono da barbearia ou barbeiro vinculado.
- `DEFAULT_BARBEARIA_ID` e `DEFAULT_BARBEIRO_ID` devem ser tratados como fallback de desenvolvimento, nao como modelo final do SaaS.

### Frontend

Stack:

- React;
- Vite;
- React Router;
- Axios;
- Tailwind/CSS local;
- Vitest + Testing Library.

Rotas principais:

- `/`: landing page;
- `/welcome`: landing page;
- `/login`: login e criacao de acesso;
- `/verify-email`: verificacao legada por link;
- `/verify-code`: verificacao por codigo de 6 digitos;
- `/forgot-password`: recuperacao de senha;
- `/accept-invite`: aceite de convite;
- `/app`: agenda operacional;
- `/services`: catalogo de servicos e produtos;
- `/team`: equipe e convites;
- `/financial`: caixa/financeiro;
- `/expenses`: despesas;
- `/settings`: perfil/configuracoes;
- `*`: not found.

Camada de dados:

- `frontend/src/lib/api/client.js`: Axios centralizado, timeout, erro padrao, header Bearer e refresh em `401`.
- `frontend/src/lib/auth.js`: storage local de `accessToken` e `refreshToken`.
- `frontend/src/lib/store.js`: fachada de compatibilidade sobre os modulos de API por dominio.
- `frontend/src/lib/api/*.api.js`: modulos por dominio.

Ponto importante:

- O fluxo principal nao usa mais localStorage como fonte de dados de negocio.
- `store.js` ainda remove chaves antigas no `clearAllData`, mas isso e limpeza de legado, nao persistencia principal.
- `apiClient` usa timeout configuravel por `VITE_API_TIMEOUT_MS` e faz warmup de `/health` para reduzir o impacto do cold start do Render Free.

## 5. Status por Area

### Baseline Local

Status: parcial avancado.

Feito:

- scripts de raiz existem;
- backend tests passam;
- frontend tests passam;
- build de frontend passa;
- lint passa com `--max-warnings=0`;
- `.\scripts\check-all.ps1` passa;
- backend e frontend sobem localmente;
- smoke live com API autenticada passa;
- fluxo principal validado manualmente no navegador;
- CI esta configurado;
- app tem rotas e fluxo principal estruturados.

Falta:

- automatizar E2E minimo ou manter checklist manual definitivo.

### Auth e Conta

Status: parcial avancado.

Feito:

- `POST /auth/register` cria usuario;
- cadastro cria workspace/barbearia para owner;
- verificacao de email por codigo de 6 digitos;
- verificacao por codigo cria sessao e abre o app sem exigir novo login;
- reenvio de codigo;
- `POST /auth/login` retorna `accessToken`, `refreshToken` e `user`;
- `GET /auth/me` funciona com `Authorization`;
- login no frontend salva sessao;
- reload tenta recuperar usuario atual;
- logout limpa tokens locais;
- reset de senha por codigo existe;
- testes backend cobrem register, login, me, verify-code, verify-email, forgot-password e reset-password;
- testes frontend cobrem login/signup, verify-code e forgot-password;
- usuario validou manualmente cadastro pelo formulario, verificacao por codigo, login e entrada em `/app`.

Falta:

- decidir se `/verify-email` por link continua ou vira legado removido;
- melhorar UX de erro em todos os estados de auth;
- cobrir refresh token em teste direto;
- decidir comportamento final para redirect de `/` quando usuario ja esta logado.

### Refresh Token e Sessao

Status: parcial.

Feito:

- backend emite refresh token JWT;
- `/auth/refresh` gera novo access token;
- frontend tenta refresh automatico em `401`;
- frontend limpa sessao se refresh falha.

Falta:

- persistir hash do refresh token no banco;
- rotacionar refresh token ao usar;
- revogar refresh token antigo;
- implementar logout de servidor, se mantivermos refresh persistido;
- definir se MVP aceita `localStorage` documentado ou migra para cookie `HttpOnly`.

Decisao recomendada para o TCC:

- Para demo local: manter refresh em `localStorage` documentado.
- Para producao real: criar tabela de refresh tokens e migrar para cookie `HttpOnly`.

### Tenant, Workspace e Isolamento

Status: parcial avancado.

Feito:

- usuario owner cria workspace/barbearia no cadastro;
- barbeiro pode ser vinculado a usuario;
- contexto de usuario resolve:
  - `role`;
  - `barbearia_id`;
  - `barbeiro_id`.
- services, products, expenses, appointments, profile, barbers e financial usam contexto autenticado;
- testes backend cobrem acesso por barbearia e restricoes de barbeiro em agenda/financeiro;
- teste live com dois owners validou que um usuario nao lista nem altera dados do outro.

Falta:

- remover dependencia de `DEFAULT_BARBEARIA_ID` no fluxo principal quando possivel;
- ajustar `/health/db` para nao depender do tenant default em ambiente final;
- criar onboarding para usuario sem barbearia, caso esse estado continue possivel.

### Rotas Protegidas

Status: majoritariamente feito.

Feito:

- `/auth/me` protegido;
- `/services` protegido;
- `/products` protegido;
- `/expenses` protegido;
- `/agendamentos` protegido;
- `/profile` protegido;
- `/financial/summary` protegido;
- `/barbers` protegido.
- usuario validou manualmente as telas principais com token real no navegador.
- `/reset` e `/test-email` ficam fora de producao e retornam `404` nesse ambiente.

Falta:

- criar teste explicito para `401` sem token nas rotas principais;
- garantir que nenhuma tela entra em loop de login.

### Agenda Operacional

Status: parcial avancado.

Feito:

- `/app` protegido;
- lista agendamentos por dia;
- cria, edita e exclui agendamento;
- status de pagamento/fiado;
- relacao com barbeiro;
- filtro visual por barbeiro;
- row de barbeiros na agenda mostra apenas outros barbeiros da equipe;
- agenda abre por padrao na propria agenda do usuario, sem avatar ativo;
- botao discreto `minha agenda` volta da agenda de outro barbeiro para a agenda do usuario;
- header da agenda mostra foto/nome da agenda ativa, com fallback por iniciais;
- resumo operacional;
- fluxo em modal/sheet em vez de tela cheia pesada;
- backend protege agenda por usuario/barbeiro;
- testes backend cobrem permissoes de agenda;
- teste frontend cobre row de barbeiros da agenda;
- teste live por API criou e listou agendamento pago com servico e produto;
- usuario validou manualmente criar, editar, mudar status e excluir agendamento pela interface.

Falta:

- criar E2E minimo ou checklist manual definitivo.

### Catalogo de Servicos e Produtos

Status: feito.

Feito:

- listar servicos;
- criar servico;
- editar servico;
- excluir servico;
- listar produtos;
- criar produto;
- editar produto;
- excluir produto;
- validacao de nome e preco;
- loading, refresh, erro e estado vazio;
- API por dominio;
- rotas protegidas;
- vinculo com `barbearia_id` no backend;
- usuario validou catalogo manualmente no navegador.

Falta:

- teste frontend dedicado para CRUD de servicos/produtos, se quiser aumentar garantia automatizada.

### Despesas

Status: feito.

Feito:

- tela real de despesas;
- listar por dia;
- criar despesa;
- editar despesa;
- excluir despesa;
- total do dia;
- loading, erro, envio e estado vazio;
- validacao de nome e valor;
- teste frontend cobrindo edicao;
- rota protegida e tenant no backend;
- usuario validou despesas manualmente no navegador.

Falta:

- cobrir criar/excluir em teste frontend se quiser aumentar garantia.

### Financeiro

Status: parcial.

Feito:

- tela de financeiro existe;
- busca `GET /financial/summary`;
- resumo por dia;
- resumo admin por barbeiro;
- resumo do barbeiro limitado ao proprio barbeiro;
- calculo de comissao;
- testes backend de financeiro passam;
- usuario validou financeiro manualmente no navegador.

Falta:

- confirmar regra final: caixa deve ou nao descontar despesas no mesmo resumo;
- validar com dados reais de agenda e despesas;
- criar teste frontend do resumo financeiro;
- deixar claro na UI o que entra no calculo.

### Equipe e Convites

Status: parcial avancado.

Feito:

- listar barbeiros;
- criar barbeiro;
- editar barbeiro;
- enviar convite;
- aceitar convite;
- vincular barbeiro ao usuario;
- convite gera sessao para o usuario aceito;
- testes backend cobrem criacao e aceite de convite;
- usuario validou equipe/convite manualmente no navegador.

Falta:

- revisar permissoes por role na UI;
- documentar fluxo de convite para demo;
- confirmar comportamento de convite expirado/revogado na interface.

### Perfil e Configuracoes

Status: parcial avancado.

Feito:

- `/profile` protegido;
- busca perfil por usuario autenticado;
- salva nome da barbearia e nome do barbeiro quando ha contexto;
- salva foto de perfil do barbeiro via Supabase Storage;
- frontend tem tela de settings;
- teste frontend cobre configuracoes operacionais sem acoes dev-only e upload de foto;
- teste live por API validou persistencia de nome, horarios, duracao e intervalo.

Falta:

- decidir se settings deve incluir onboarding inicial;
- remover ou proteger acoes de reset para deploy.

### Landing e Primeira Experiencia

Status: parcial.

Feito:

- landing existe;
- `/` e `/welcome` apontam para landing;
- CTA leva para login/cadastro;
- teste frontend cobre pitch da landing.

Falta:

- decidir se usuario logado deve cair na landing ou ser redirecionado para `/app`;
- validar cadastro completo saindo da landing;
- preparar copy final para apresentacao.

### Deploy e Demonstracao

Status: parcial avancado.

Feito:

- guia `docs/DEPLOY_RENDER_VERCEL.md` existe;
- comandos de Render e Vercel estao documentados;
- variaveis principais estao listadas;
- backend publicado no Render em `https://kurt-api.onrender.com`;
- frontend publicado na Vercel em `https://kurt-barbearia.vercel.app`;
- frontend usa `VITE_API_URL` apontando para o Render;
- CORS e `APP_URL` foram configurados para a URL publica da Vercel;
- frontend tolera cold start do Render Free com timeout maior e warmup em `/health`;
- suporte a Brevo API foi implementado e testado no backend.

Falta:

- criar/configurar conta Brevo Free, API key e remetente verificado;
- salvar `BREVO_API_KEY`, `EMAIL_PROVIDER=brevo` e `EMAIL_FROM` verificado no Render;
- fazer redeploy do backend apos ativar a Brevo;
- validar cadastro real em producao recebendo codigo por email;
- rodar smoke test completo em ambiente publicado;
- preparar roteiro de demo.

## 6. Checklist Consolidado

### Feito

- [x] Backend Fastify em camadas.
- [x] Supabase/Postgres via Knex.
- [x] Migrations principais versionadas.
- [x] API REST para dominios centrais.
- [x] Cliente HTTP centralizado no frontend.
- [x] URL da API por `VITE_API_URL`.
- [x] Header `Authorization: Bearer` automatico.
- [x] Refresh automatico em `401` no frontend.
- [x] AuthContext e rotas protegidas no frontend.
- [x] Login e cadastro no frontend.
- [x] Verificacao por codigo de 6 digitos.
- [x] Entrada automatica no app apos codigo de verificacao valido.
- [x] Reset de senha por codigo.
- [x] Criacao de workspace/barbearia no cadastro.
- [x] Agenda operacional como tela principal.
- [x] Foto de perfil do barbeiro na Agenda e em Configuracoes.
- [x] Catalogo de servicos/produtos com CRUD e validacao.
- [x] Despesas reais com CRUD e validacao.
- [x] Financeiro conectado a API.
- [x] Equipe e convites no backend.
- [x] Fluxo de aceite de convite.
- [x] Perfil autenticado.
- [x] Landing publica.
- [x] CI configurado.
- [x] Backend tests passando.
- [x] Frontend tests passando.
- [x] Build frontend passando.
- [x] Gate completo `.\scripts\check-all.ps1` verde.
- [x] Smoke live local com backend e frontend no ar.
- [x] Isolamento entre dois usuarios validado em runtime.
- [x] Fluxo completo validado manualmente no navegador.
- [x] Frontend publicado na Vercel.
- [x] Backend publicado no Render.
- [x] CORS e `APP_URL` ajustados para producao.
- [x] Timeout/warmup do frontend ajustado para Render Free.
- [x] Suporte a Brevo API para email transacional.
- [x] Viewport/safe area ajustados para iOS Safari.

### Parcial

- [ ] Loading, erro e estado de envio padronizados em todas as operacoes.
- [ ] Feedback de erro totalmente padronizado para o usuario.
- [ ] Acessibilidade basica revisada em todas as telas.
- [ ] Modelos/DTOs documentados por rota.
- [ ] Contratos de API documentados e validados em um unico lugar.
- [ ] Refresh token persistido, rotacionado e revogavel.
- [ ] E2E minimo automatizado ou checklist manual definitivo.

### Pendente para deploy real

- [x] Proteger ou remover `/reset`.
- [x] Confirmar que `/test-email` nao fica exposto em producao.
- [x] Configurar Render.
- [x] Configurar Vercel.
- [x] Ajustar CORS e `APP_URL`.
- [ ] Definir politica final de refresh token.
- [ ] Configurar Brevo Free no Render com remetente verificado.
- [ ] Confirmar bucket `barber-avatars`/`AVATAR_BUCKET` no Supabase de producao.
- [ ] Rodar smoke test em producao/staging.
- [ ] Preparar roteiro de apresentacao.

## 7. Proximo Passo Imediato

O proximo passo correto nao e criar tela nova.

Ordem recomendada:

1. configurar Brevo Free no Render com remetente verificado;
2. fazer redeploy do backend;
3. testar cadastro real em producao recebendo codigo por email;
4. rodar smoke completo no app publicado;
5. preparar roteiro de apresentacao.

Fluxo local, API, navegador, rotas internas de sistema e deploy base ja foram validados. Agora o foco e fechar o email gratuito de producao e ensaiar a demonstracao.

## 8. Roadmap por Prioridade

### Sprint 1 - Gate Verde e Validacao Local

Objetivo: ter confianca tecnica antes de seguir.

Tarefas:

- corrigir warning de hook em `AppointmentDialog.jsx` - feito;
- rodar `.\scripts\check-all.ps1` ate passar - feito;
- rodar smoke live - feito por API autenticada;
- validar navegador com usuario real - feito pelo usuario;
- decidir comportamento de `/` para usuario autenticado.

Entrega:

- gate local verde;
- fluxo basico validado em runtime;
- bloqueios reais documentados.

### Sprint 2 - Auth, Sessao e Tenant

Objetivo: garantir que cada usuario opera na propria barbearia.

Tarefas:

- validar cadastro novo criando barbearia;
- validar login depois de verificacao por codigo;
- validar `/auth/me` apos login;
- criar teste ou checklist de dois usuarios - feito em runtime por API;
- decidir refresh token MVP vs producao;
- documentar limitacao de refresh em `localStorage` se mantida.

Entrega:

- usuario novo entra no app sem mexer no banco;
- dados operacionais ficam ligados ao usuario/barbearia correta.

### Sprint 3 - Fluxos Operacionais

Objetivo: fechar a demo de uso diario.

Tarefas:

- agenda: criar/listar por API autenticada - feito; criar/editar/mudar status/excluir pela interface - feito pelo usuario;
- agenda: row de barbeiros simplificada para propria agenda por padrao e selecao apenas de outros barbeiros - feito;
- catalogo: servicos/produtos criados por API autenticada - feito;
- despesas: criar e listar por API autenticada - feito;
- financeiro: regra atual conferida por API autenticada - feito;
- equipe/convite validado manualmente pelo usuario.

Entrega:

- dono de barbearia consegue demonstrar o ciclo principal do dia.

### Sprint 4 - Qualidade de UI e Contratos

Objetivo: reduzir bugs visuais e ambiguidades.

Tarefas:

- padronizar mensagens de erro;
- revisar estados vazios/loading;
- revisar foco, labels e navegacao por teclado;
- documentar payloads de request/response;
- criar testes frontend faltantes para catalogo, financeiro e agenda.

Entrega:

- UX previsivel e contratos mais claros.

### Sprint 5 - Deploy e Apresentacao

Objetivo: deixar pronto para demonstrar.

Tarefas:

- preparar Render - feito;
- preparar Vercel - feito;
- configurar variaveis principais - feito;
- configurar CORS - feito;
- validar email com Brevo API em producao;
- rodar smoke completo em ambiente publicado;
- preparar roteiro de apresentacao.

Entrega:

- MVP demonstravel com seguranca basica.

## 9. Criterios de Pronto do MVP

O MVP do TCC pode ser considerado pronto quando:

- `.\scripts\check-all.ps1` passa sem falhas;
- frontend abre localmente;
- backend responde `/health`;
- cadastro cria usuario e barbearia;
- verificacao por codigo funciona;
- login retorna sessao valida;
- `/auth/me` retorna usuario autenticado com contexto;
- agenda cria e lista agendamentos por API autenticada;
- servicos e produtos criam e listam por API autenticada;
- despesas criam e listam por API autenticada;
- financeiro mostra resumo coerente com a regra definida;
- isolamento entre duas barbearias e validado em runtime;
- navegador valida os fluxos principais visualmente;
- editar e excluir agenda/catalogo/despesas sao validados manualmente ou por E2E;
- reload mantem ou recupera sessao corretamente;
- equipe lista barbeiros e convite funciona;
- usuario A nao enxerga dados do usuario B;
- fluxo principal passa no navegador;
- deploy ou ambiente de demo esta configurado;
- roteiro de apresentacao esta ensaiado.

## 10. Comandos de Trabalho

### Status

```powershell
git status --short
```

### Validacao completa local

```powershell
.\scripts\check-all.ps1
```

### Validacao completa com smoke live

```powershell
.\scripts\check-all.ps1 -Live
```

### Rodar backend

```powershell
cd backend
npm run dev
```

### Rodar frontend

```powershell
cd frontend
npm run dev
```

### Testes backend

```powershell
cd backend
npm test
```

### Testes frontend

```powershell
cd frontend
npm test
```

### Build frontend

```powershell
cd frontend
npm run build
```

### Smoke com servidores ja rodando

```powershell
.\scripts\test-dev.ps1
```

## 11. Regras Para Atualizar Este Documento

Atualizar este roadmap quando:

- uma feature mudar de status;
- um teste passar ou falhar de forma relevante;
- uma decisao de produto for tomada;
- um endpoint mudar contrato;
- um fluxo for validado no navegador;
- um bug virar proximo passo;
- o deploy mudar.

Nao criar outro checklist paralelo para status do app. Se um guia tecnico especifico continuar existindo, ele deve apontar para este roadmap quando falar de status.

## 12. Notas de Risco

- Refresh token ainda nao e revogavel em banco.
- Existem documentos antigos em `docs/` que podem conter passos historicos. Para status atual do app, usar este arquivo.
