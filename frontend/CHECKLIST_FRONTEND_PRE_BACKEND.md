# Checklist Frontend Pre-Backend

Checklist de melhorias significativas do frontend para reduzir retrabalho antes de avançar no backend.

## 1) Bloqueadores (Prioridade Alta)

- [x] Unificar camada de dados (evitar modelo hibrido API + localStorage).
- [x] Centralizar acesso a dados em uma camada de API por dominio.
- [ ] Adicionar tratamento de `loading`, `error` e estado de envio em todas as operacoes assincronas (em andamento: principais fluxos concluidos).
- [x] Corrigir potencial bug de data por fuso horario no `formatDayKey`.
- [x] Finalizar fluxos pendentes de negocio (Financeiro e Despesas).
- [ ] Definir contrato unico de dados no frontend (DTOs e nomenclatura consistente).

## 2) Melhorias Importantes (Prioridade Media)

- [x] Mover URL da API para variavel de ambiente (`VITE_API_URL`).
- [ ] Fortalecer validacoes de formulario (campos obrigatorios, valores invalidos, limites).
- [ ] Padronizar feedback de erro para o usuario (mensagens claras + estado visual).
- [ ] Revisar acessibilidade basica (foco, labels, navegacao por teclado, `aria-*`).
- [ ] Remover/limpar estilos legados nao utilizados em `src/App.css`.
- [ ] Revisar padrao de confirmacao para acoes destrutivas (exclusao).

## 3) O Que Construir e Finalizar Antes do Backend

### 3.1 Contratos e Modelagem

- [ ] Definir modelos para: Appointment, Service, Product, Expense, Profile.
- [ ] Documentar payloads de requisicao/resposta por rota.
- [ ] Isolar conversao de nomes de campos (ex.: `client_name` vs `cliente_nome`) em um unico ponto.

### 3.2 Camada HTTP e Estado

- [x] Criar `api/client` central (axios configurado, timeout, interceptors, erro padrao).
- [x] Criar modulos de dominio: `appointments.api`, `services.api`, `products.api`, `expenses.api`, `profile.api`.
- [ ] Adotar estrategia de cache/invalidation para dados de servidor (ex.: React Query).
- [ ] Padronizar retries e mensagens de falha para operacoes criticas.

### 3.3 UX de Fluxos Criticos

- [x] Agendamento: criar/editar/excluir com feedback visual completo.
- [x] Resumo diario: garantir consistencia com dados reais da API.
- [ ] Servicos/Produtos: cadastro e edicao com validacao robusta (em andamento).
- [x] Financeiro/Despesas: implementar telas reais (sem placeholder) com fluxo minimo operacional.

### 3.4 Qualidade e Seguranca de Entrega

- [ ] Criar testes de fluxo critico com Vitest + Testing Library.
- [ ] Cobrir cenarios minimos: criar, editar e excluir agendamento.
- [ ] Cobrir calculo de resumo diario.
- [ ] Cobrir cadastro de servicos/produtos.
- [ ] Configurar pipeline CI com `lint`, `test` e `build`.

## 4) Roadmap de Execucao (Fases)

### Semana 1 - Fundacao Tecnica

- [x] Refatorar `src/lib/store.js` para servicos por dominio.
- [x] Introduzir variaveis de ambiente para URL da API.
- [x] Corrigir data/fuso e normalizacao de payloads.
- [x] Adicionar estados de loading/error no fluxo de agendamentos.

### Semana 2 - Fechamento de Produto

- [ ] Implementar telas reais de Financeiro e Despesas.
- [ ] Endurecer validacoes de formularios.
- [ ] Melhorar UX de confirmacoes e estados vazios.

### Semana 3 - Blindagem para Integracao Backend

- [ ] Implementar testes dos fluxos principais.
- [ ] Revisar contratos finais frontend-backend.
- [ ] Documentar criterios de pronto para integracao.

## 5) Definicao de Pronto (DoD) para iniciar backend

Marcar como pronto somente quando todos os itens abaixo estiverem concluidos:

- [ ] Sem uso de fonte de dados hibrida em fluxo principal.
- [ ] Erros e carregamento tratados em todas as operacoes de API.
- [ ] Financeiro e Despesas sem placeholders.
- [ ] Contratos de API documentados e validados.
- [ ] Testes minimos de regressao passando.
- [ ] `lint`, `test` e `build` verdes em pipeline.

## 6) Observacoes do estado atual (baseline)

- [x] Lint executado com sucesso.
- [x] Build executado com sucesso.
- [ ] Atualizar base do Browserslist (warning nao bloqueante).
