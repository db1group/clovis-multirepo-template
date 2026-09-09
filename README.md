# clovis-multirepo-template

Repositório wrapper para habilitar o fluxo spec-driven (SDD) do Clovis CLI em cenários cross-repo,
permitindo planejar e implementar, em uma mesma rodada, features que atravessam vários microserviços
ou combinam backend e frontend. Este repositório centraliza skills, specs, mapas e inventário dos
repositórios do ecossistema para dar contexto único ao trabalho, enquanto cada repositório continua
com ciclo de vida próprio (versionamento, releases, pipelines e automações).

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

## Como adicionar novos repositórios

O arquivo [`repositories.json`](repositories.json) usa formato de array simples.
Cada item deve ter, no mínimo, `name` e `url`.

Exemplo:

```json
[
   {
      "name": "core-service",
      "url": "git@github.com:your-org/core-service.git"
   },
   {
      "name": "novo-repositorio",
      "url": "git@github.com:your-org/novo-repositorio.git"
   }
]
```

Regras importantes:

- `name` vira o nome da pasta em `repositories/`, então precisa ser único.
- Use apenas caracteres seguros no `name`: `a-z`, `0-9`, `.`, `_` e `-`.
- `url` deve ser a URL do remote git com acesso configurado na sua máquina.

Depois de editar o inventário:

```bash
npm run clone -- --dry-run
npm run clone
```

## Fluxo de clone e atualização

### Repassando opções via init

Argumentos informados após `--` em `npm run init` são repassados para o script de clone.

```bash
npm run init -- --depth 1
npm run init -- --only core-service
```

### Atualizando clones existentes

Para sincronizar repositórios já clonados:

```bash
npm run clone:update
```

Com `--update`, o script faz fetch e só avança a branch local por fast-forward.
Se houver alterações locais não commitadas, o repositório é apenas reportado.

Uma falha em um repositório não interrompe os demais. Ao final, sai um relatório com o que foi
clonado, atualizado, mantido sem alteração e com falha.

### Ajuda completa

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
