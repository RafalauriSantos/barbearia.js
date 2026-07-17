---
name: git-commit-workflow
description: Garante que o Claude (ou qualquer agente de código) faça commits e pushes corretos depois de qualquer mudança aprovada — em vez de deixar o diff parado sem comitar, ou comitar tudo junto com mensagem genérica. Use esta skill sempre que o usuário pedir para "commitar", "dar push", "salvar as mudanças no git", "subir pro repositório", ou sempre que uma tarefa de código for concluída e aprovada pelo usuário e ainda não tiver sido commitada. Também use proativamente ao final de qualquer sessão de programação onde mudanças de código foram feitas e aceitas, mesmo que o usuário não peça explicitamente o commit — não deixe trabalho aprovado sem versionar.
---

# Git Commit Workflow

Workflow padrão para transformar mudanças de código aprovadas em commits limpos e enviados ao repositório remoto, sem depender do usuário lembrar de pedir isso toda vez.

## Quando usar

- Sempre que o usuário aprovar uma mudança de código (explicitamente, ou implicitamente ao seguir para a próxima tarefa sem objeções).
- Ao final de qualquer sessão de programação com mudanças pendentes no working directory.
- Quando o usuário pedir para "commitar", "subir", "dar push", "salvar no git".
- **Não** use para mudanças ainda em rascunho, exploratórias, ou que o usuário disse explicitamente "não comita ainda".

## Regra de ouro

Nunca deixe trabalho aprovado sem commit. Se uma mudança foi aceita e a sessão está indo para outra tarefa, o commit deve acontecer antes — não depois, não "quando o usuário lembrar".

## Passo a passo

### 1. Revisar o que vai entrar no commit

Antes de qualquer coisa, rode:

```bash
git status
git diff
```

Leia o diff de verdade — não assuma que sabe o que mudou só pela lista de arquivos. Confira:
- Nenhum arquivo de segredo (`.env`, chaves, tokens) está sendo commitado.
- Nenhum `node_modules`, build output, ou arquivo temporário está sendo incluído (confira o `.gitignore` se algo suspeito aparecer no `git status`).

### 2. Quebrar em commits atômicos

Um commit = uma mudança lógica. Não empacote features diferentes, correções não relacionadas, ou refatoração + feature nova no mesmo commit.

Se o diff cobre mais de uma mudança lógica, use `git add -p` (ou `git add <arquivo>` seletivamente) para separar em múltiplos commits, na ordem que faz sentido pra história do projeto.

Exemplo de como pensar a separação:
- Mudança de configuração de build → um commit.
- Correção de bug → outro commit.
- Feature nova → outro commit.

### 3. Escrever a mensagem no padrão Conventional Commits

Formato: `tipo(escopo): descrição curta no imperativo`

Tipos permitidos:
| Tipo | Quando usar |
|------|-------------|
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `refactor` | mudança de código sem alterar comportamento |
| `chore` | manutenção, dependências, configuração |
| `docs` | documentação |
| `test` | testes |
| `ci` | pipeline, workflows, deploy |

Regras da mensagem:
- Imperativo, não passado: "corrige validação" não "corrigiu validação".
- Curta na primeira linha (idealmente até ~72 caracteres).
- Se precisar de mais contexto, adicione corpo do commit separado por linha em branco explicando o *porquê*, não só o *o quê*.

Exemplos:
```
fix(auth): corrige validação de token expirado
feat(agenda): adiciona filtro por barbeiro na listagem
chore(deps): sincroniza package-lock.json com esbuild 0.28.1
refactor(caixa): extrai lógica de fechamento para service separado
```

### 4. Mostrar o resumo antes de comitar

Antes de rodar `git commit`, apresente ao usuário:
- Quais arquivos entram em cada commit.
- A mensagem proposta de cada commit.

Isso não precisa ser uma pausa longa — um resumo de 2-3 linhas por commit já basta. Só não comite silenciosamente sem essa visibilidade, a menos que o usuário já tenha dado instrução permanente para pular essa etapa.

### 5. Commitar e dar push

```bash
git commit -m "tipo(escopo): descrição"
git push
```

Depois do push, confirme sucesso (`git log --oneline -1` e `git status` limpo). Se o push falhar (branch desatualizada, conflito), pare e reporte — não force push sem autorização explícita do usuário.

### 6. Exceções — quando NÃO comitar automaticamente

- Usuário disse explicitamente "não comita ainda" ou "só me mostra o diff".
- Mudança está incompleta ou quebra o build/testes.
- Mudança envolve arquivos sensíveis que precisam de revisão extra (credenciais, configuração de produção).

Nesses casos, pare no passo 1 ou 2, mostre o que faria, e espere confirmação.

## Aplicando isso permanentemente num projeto

Para projetos onde esse comportamento deve ser padrão sem precisar invocar a skill toda vez, adicione um arquivo `CLAUDE.md` (ou equivalente do agente usado) na raiz do repositório com um resumo destas regras. A maioria dos agentes de código lê esse arquivo automaticamente no início de cada sessão.
