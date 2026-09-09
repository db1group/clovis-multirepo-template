# clovis-multirepo-template

Template de repositório wrapper para uso com Clovis CLI em cenários multi-repositório:
skills, specs e mapas consultados pelos agentes, mais o inventário dos repositórios do ecossistema.

## Pré-requisitos

- **Node.js 24+** (ver [`.nvmrc`](.nvmrc)) — `nvm use`
- **git** no `PATH`, com acesso aos remotes já configurado (chave SSH carregada no agente)

## Primeiros passos

```bash
nvm use
npm run init
```

`init` faz as duas etapas de preparação, uma após a outra, e mostra no fim como cada uma terminou:

1. **Skills** — aponta `.claude/skills` para `.agents/skills`, que é onde o Claude Code procura as
   skills do projeto. Funciona em Windows, Linux e macOS, e pode ser repetido à vontade.
2. **Repositórios** — clona em `repositories/` o que está declarado em
   [`repositories.json`](repositories.json). Esse diretório fica fora do controle de versão daqui;
   cada projeto clonado mantém o próprio ciclo de vida — remote, releases e automações seguem no
   repositório dele.

## Scripts disponíveis

Os scripts abaixo estão definidos em `package.json` e podem ser executados com `npm run`.

### `npm run init`

Roda a preparação inicial do wrapper em duas etapas:

1. cria/atualiza o link de skills com `npm run link:skills`;
2. executa o clone de repositórios com `npm run clone`.

Exemplos:

```bash
npm run init
npm run init -- --depth 1
npm run init -- --only core-service
```

### `npm run clone`

Clona em `repositories/` todos os repositórios declarados em `repositories.json` que ainda não
existem localmente.

Exemplos:

```bash
npm run clone
npm run clone -- --only integration-api
npm run clone -- --depth 1
npm run clone -- --dry-run
```

### `npm run clone:update`

Executa o mesmo fluxo de clone, mas com atualização dos clones existentes (`fetch` +
`fast-forward` quando possível).

Exemplos:

```bash
npm run clone:update
npm run clone:update -- --only core-service
```

### `npm run link:skills`

Cria (ou corrige) o link `.claude/skills` apontando para `.agents/skills`.

Exemplo:

```bash
npm run link:skills
```

Opções escritas depois de `--` seguem para a etapa de clone:

```bash
npm run init -- --depth 1        # primeira carga mais rápida, histórico truncado
```

As etapas também rodam soltas, via `npm run link:skills` e `npm run clone`.

Para sincronizar os clones existentes depois:

```bash
npm run clone:update
```

O `--update` só avança a branch local por fast-forward — alterações locais não commitadas são
preservadas e o repositório é apenas reportado.

Uma falha em um repositório não interrompe os demais. No fim da execução sai um relatório com o
que foi clonado, o que foi atualizado e, para cada falha, a mensagem do git e a URL do remote.

Todas as opções em:

```bash
node scripts/clone-repositories.js --help
```

## Onde fica o quê

| Caminho | Conteúdo |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Instruções e convenções para agentes — leia primeiro |
| `.agents/skills/` | Skills de domínio e de convenção |
| `.agents/specs/` | Specs por unidade de trabalho |
| `repositories.json` | Inventário dos repositórios do ecossistema |
| `repositories/` | Clones locais, provisionados pelo script |
| `scripts/` | Automações deste repositório em JavaScript (Node 24+, sem dependências) |
