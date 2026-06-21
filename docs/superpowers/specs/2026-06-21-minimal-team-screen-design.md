# Tela de equipe minimalista

## Referencia visual

A implementacao deve reproduzir fielmente o mockup aprovado pelo usuario:

`C:\Users\Rafael lauri\.codex\generated_images\019e8ab7-deef-7e21-a026-15c311161326\exec-57207ac2-2707-48c9-a194-eb023aee6277.png`

O mockup e a fonte de verdade para hierarquia, densidade, alinhamento, cores e distribuicao dos elementos. A implementacao deve permanecer coerente com os tokens e componentes existentes do aplicativo.

## Objetivo

Transformar a tela de equipe em uma visao operacional curta e escaneavel. O administrador deve entender quem esta trabalhando, o estado de acesso, o proximo atendimento e o volume do dia sem percorrer paineis, filtros e agendas duplicadas.

## Estrutura da tela

### Cabecalho

- Titulo unico `Equipe`.
- Navegacao da data na mesma linha, com botoes de dia anterior e proximo dia.
- Data central no formato usado pelo aplicativo.
- Um unico botao de configuracao para abrir a gestao da equipe.
- Remover o eyebrow `Equipe` e o titulo redundante `Gestao`.

### Resumo

- Uma unica linha discreta: `{quantidade} barbeiros · {quantidade} atendimentos hoje`.
- Usar icone de equipe em verde.
- Remover os seis blocos de metricas, inclusive livres, proximo, recebido e a cobrar.
- Informacoes financeiras continuam nas telas financeiras apropriadas.

### Lista de barbeiros

- Uma unica superficie agrupada com borda sutil e divisores internos.
- Cada barbeiro ocupa uma linha, sem card individual.
- Ordem visual da linha:
  1. avatar circular com iniciais;
  2. nome e estado de acesso;
  3. proximo atendimento, com horario, cliente e servico quando disponiveis;
  4. quantidade de atendimentos no dia;
  5. botao `+` para adicionar atendimento;
  6. chevron para abrir a agenda completa do barbeiro.
- Estados de acesso:
  - verde para acesso ativo;
  - laranja para convite pendente;
  - vermelho discreto para barbeiro sem acesso.
- Quando nao houver proximo atendimento, exibir `Agenda livre`.
- Nao exibir previsualizacoes repetidas de atendimentos nem metricas individuais.

### Agenda individual

- Tocar na linha ou no chevron abre a agenda completa do barbeiro.
- A agenda individual mantem inclusao e edicao de atendimentos.
- A visao detalhada deve substituir a lista durante a navegacao, com retorno claro para `Equipe`.
- A tela principal nao deve renderizar a grade completa de horarios.

### Gestao da equipe

- O botao de configuracao abre um bottom sheet secundario.
- O sheet preserva:
  - cadastro de barbeiro;
  - email de acesso;
  - percentual de comissao;
  - envio e reenvio de convite;
  - copia do link de convite;
  - estado do acesso.
- O formulario de novo barbeiro fica recolhido por padrao e abre por uma acao clara `Adicionar barbeiro`.
- A lista de acessos usa linhas compactas em vez de cards aninhados.
- Mensagens de sucesso, erro e link do convite permanecem visiveis no contexto da acao.

### Navegacao inferior

- Preservar a barra inferior e as seis rotas atuais.
- `Equipe` deve permanecer como aba ativa em verde.
- Nao alterar rotas ou regras de autorizacao.

## Responsividade

- O mobile segue diretamente o mockup aprovado.
- Em larguras maiores, manter a mesma hierarquia e limitar a largura de leitura; nao transformar a lista em dashboard de cards.
- Textos longos devem truncar sem deslocar contagens ou botoes.
- Acoes devem manter area de toque minima de 36 por 36 pixels.

## Comportamento e dados

- Reutilizar os dados e operacoes atuais de barbeiros, agendamentos e convites.
- Nao alterar contratos do backend.
- O resumo e as linhas devem reagir a mudanca de data.
- O proximo atendimento considera o horario atual quando a data selecionada for hoje; em outras datas, usa o primeiro atendimento do dia.
- Durante salvamentos, impedir repeticao de convite ou cadastro e manter feedback de carregamento.
- Falhas de carregamento exibem aviso compacto com acao para tentar novamente.

## Remocoes explicitas

- Grade de seis metricas no topo.
- Filtro horizontal `Todos` e chips por barbeiro.
- Cards independentes por barbeiro.
- Metricas `Hoje`, `Livres` e `Recebido` dentro de cada barbeiro.
- Duas previsualizacoes de atendimentos em cada card.
- Botao textual `Ver agenda do barbeiro`.
- Repeticao de status `Acesso ativo` no mesmo bloco.

## Criterios de aceite

- A primeira dobra mobile corresponde visualmente ao mockup aprovado.
- A tela mostra somente resumo e lista compacta antes da navegacao inferior.
- Cada barbeiro permite adicionar atendimento e abrir a agenda detalhada.
- Cadastro, convite, reenvio e copia do link continuam funcionando no sheet de gestao.
- Estados vazio, carregando e erro permanecem claros sem criar novos paineis pesados.
- Testes cobrem lista compacta, navegacao para agenda, abertura da gestao e protecao contra convites repetidos.
- Lint, testes unitarios, build e smoke tests desktop/mobile passam.
