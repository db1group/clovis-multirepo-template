# Guia do dia a dia — squad

Para quem **entra num repositório central já preparado**. As Etapas 1 (Descoberta) e 2 (Preparação)
já foram feitas e publicadas pelo curador: o mapa funcional, o `AGENTS.md` e as skills de domínio
estão versionados. Você só precisa provisionar a máquina e começar a trabalhar.

Serve para dois perfis, que compartilham a mesma instalação e se separam a partir da Parte 3:

- **Dev** — gera especificações, implementa, abre PR e revisa código.
- **PO / analista / negócio** — descreve demanda, consolida requisito, pergunta sobre o sistema e
  investiga bug. Não precisa escrever uma linha de código.

> Se você é a pessoa que vai **montar** o repositório central ou rodar as Etapas 1 e 2, o documento é
> outro: [tutorial do curador](tutorial-curador.md). A divisão completa de responsabilidades está em
> [papéis e responsabilidades](papeis-e-responsabilidades.md).

Os exemplos usam `squad-workspace` como nome do repositório central e nomes de serviço fictícios
(`pricing-service`, `billing-service-mf`, …). Troque pelos da sua squad.

---

# Parte 1 — Instalação (uma vez, na sua máquina)

## 1.1 · Pré-requisitos

| Item | Verificação | Vale para |
| --- | --- | --- |
| Node 24+ | `nvm use && node -v` | todos |
| git no PATH | `git --version` | todos |
| Acesso SSH aos repositórios | `ssh -T git@github.com` | todos |
| Agente de IA no PATH | `copilot`, `claude`, `codex`, `cursor`, `junie` ou `devin` | todos |
| Clovis CLI | `npm i -g @dgs-engineering/clovis && clovis --version` | todos |
| **Windows:** Modo de Desenvolvedor ativo | Configurações → Sistema → Para desenvolvedores | todos |

O Modo de Desenvolvedor é necessário porque o `init` cria um link de `.claude/skills` para
`.agents/skills` — é assim que o agente encontra as skills do projeto.

## 1.2 · Clonar o central e provisionar

```powershell
cd C:\Projetos
git clone git@github.com:<org>/squad-workspace.git
cd squad-workspace

nvm use
npm run init
```

O `init` cria o link de skills e clona, em `repositories/`, todos os repositórios declarados em
`repositories.json`. É o passo demorado — dá para acelerar:

```powershell
npm run init -- --concurrency 8      # mais clones em paralelo
npm run init -- --depth 1            # clone raso: rápido, sem histórico completo
```

> `--depth 1` é ótimo para PO/analista, que só precisa ler o código. Dev que vai investigar histórico
> (`git log`, `git blame`) deve preferir o clone completo.

Uma falha isolada não interrompe as demais — no fim sai um relatório. Para reprocessar só quem falhou:

```powershell
npm run clone -- --only billing-service --only pricing-rules
```

## 1.3 · Configurar o Clovis na sua máquina

```powershell
clovis
```

**Sempre na raiz de `squad-workspace`** — nunca dentro de `repositories/<repo>`. Abrir na pasta
errada é o erro mais comum.

A configuração inicial (Etapa 0) **não vem pronta no repositório**: licença, agente, modelo e nível
de raciocínio ficam na sua máquina. O que já vem definido é o tipo de projeto (manutenção/evolução) e
o idioma dos artefatos (pt).

1. **Login** — abre uma URL; informe o e-mail corporativo e conclua o SSO.
2. **Agente de IA** — escolha entre os encontrados no PATH.
3. **Modelo** e **nível de raciocínio**.

Menu esperado, com o fluxo spec-driven **habilitado** (se as quatro etapas aparecerem desabilitadas
com "Requer a descoberta concluída (Etapa 1)", você clonou antes do curador publicar — rode
`git pull`):

```
Fluxo spec-driven
  Descobrir nova intenção (Etapa 1)
  Gerar instruções e documentação autoritativa (Etapa 2)
  Gerar especificações (Etapa 3)          ← seu ponto de entrada
  Implementar tarefas (Etapa 4)
Utilitários
  Conversa livre com o agente
  Revisão de código agêntica
  Criar Pull Request
  Diagnóstico do harness
```

## 1.4 · Checagem rápida

```powershell
Get-ChildItem repositories | Measure-Object      # deve bater com o inventário
Test-Path .agents\maps\functional-map.md         # True → Etapas 1 e 2 publicadas
Test-Path AGENTS.md                              # True
git status                                       # repositories/ NÃO deve aparecer
```

---

# Parte 2 — Começar o dia

Dois comandos, e eles fazem coisas diferentes:

```powershell
git pull              # conhecimento da squad: .agents/, AGENTS.md, repositories.json
npm run clone:update  # código dos repositórios do inventário
```

| Comando | O que faz |
| --- | --- |
| `git pull` | atualiza os artefatos do central. **Não toca em `repositories/`** |
| `npm run clone` | só **provisiona o que ainda não existe**; clone existente é pulado |
| `npm run clone:update` | `fetch` + `merge --ff-only` nos clones existentes, e clona o que faltar |

`clone:update` é conservador de propósito: sempre busca, mas **só avança quando o fast-forward é
seguro**. Ele pula e diz o motivo quando o repositório tem alterações locais não commitadas, HEAD
destacado ou branch sem upstream. E avança **a branch em que o clone está** — se você deixou um repo
numa `feature/...`, é ela que anda, não a `main`.

Para sincronizar só o que você vai mexer:

```powershell
npm run clone:update -- --only pricing-service --only pricing-service-mf
```

---

# Parte 3 — Receitas: "eu quero…"

Índice por intenção. Cada receita diz por onde entrar no menu.

| Eu quero… | Onde ir | Perfil |
| --- | --- | --- |
| Entender como uma regra funciona hoje | **Conversa livre** → modo agente | ambos |
| Transformar uma ideia vaga em requisito | **Conversa livre** → modo descoberta | PO |
| Planejar uma mudança sem tocar em nada | **Conversa livre** → modo plano | ambos |
| Investigar um bug antes de abrir demanda | **Conversa livre** → modo plano | ambos |
| Especificar uma feature ou uma correção | **Etapa 3** | ambos |
| Implementar o que já está especificado | **Etapa 4** | dev |
| Abrir o Pull Request | **Criar Pull Request** | dev |
| Revisar um PR ou duas branches | **Revisão de código agêntica** | dev |
| Saber se o repositório está bem documentado | **Diagnóstico do harness** | ambos |

## 3.1 · Conversa livre — os três modos

Menu → **Conversa livre com o agente**. São três modos, alternados com `Shift+Tab`:

| Modo | O que é | Escreve no projeto? |
| --- | --- | --- |
| `⏵⏵ Modo agente` | conversa aberta: pergunta, investiga, discute e executa | **sim**, edita arquivos e roda comandos |
| `⏸ Modo plano` | investiga e devolve um plano para você revisar | **não**, até você aprovar |
| `◆ Modo descoberta` | entrevista você para levantar escopo, regras, edge cases e critérios de aceite | não — produz um documento |

A conversa é **transitória**: sair descarta o histórico. O que você quiser guardar precisa ser salvo
ou publicado antes de encerrar.

Em qualquer modo, cite caminhos no meio do texto — o agente os lê:

> Como o cálculo de custo trata cliente isento hoje? Olhe `repositories/pricing-service` e
> `repositories/pricing-rules`.

## 3.2 · PO: transformar uma ideia em requisito (modo descoberta)

O caminho para quem descreve o que precisa ser construído, sem escrever código.

1. Menu → **Conversa livre com o agente** → `Shift+Tab` até `◆ Modo descoberta`.
2. Comece pela necessidade, **mesmo vaga**:
   > Preciso que o gerente consiga aprovar em lote os pedidos que ficaram represados por limite de
   > alçada.
3. O agente entrevista em rodadas curtas, sem limite de perguntas, até fechar as lacunas. Duas coisas
   importantes:
   - **"Não sei" é resposta válida** — vira pendência em aberto no documento.
   - Decisão **técnica** ele não pergunta: registra para você escalar ao tech lead.
4. Pronta a intenção consolidada, escolha:
   - `Salvar em arquivo temporário` — para usar como entrada da Etapa 3;
   - `Publicar em outro lugar` — Confluence, wiki do Azure DevOps, card do Jira (descreva o destino
     em texto livre; o agente pergunta o que faltar);
   - `Continuar refinando`.

O documento salvo é o insumo ideal da **Etapa 3** — sua ou de um dev.

## 3.3 · Perguntar sobre o sistema

Menu → **Conversa livre** → `⏵⏵ Modo agente` (ou `⏸ Modo plano`, se você quer garantir que nada será
alterado). Perguntas que funcionam bem porque o agente tem o mapa funcional e as skills de domínio:

> Quais serviços são acionados quando um pedido é aprovado? Cite os repositórios.

> Onde fica a regra de recusa automática por limite de crédito? Existe duplicação entre
> `billing-service` e `pricing-rules`?

> O microfrontend de simulação consome qual contrato? Ele passa por algum gateway?

## 3.4 · Investigar um bug antes de abrir demanda

Menu → **Conversa livre** → `⏸ Modo plano`. Somente leitura: o agente investiga e devolve um plano
com os passos, os arquivos afetados e como verificar — **sem editar nada**.

> Cliente relata que o preço final ignora o desconto de fidelidade em contratos com mais de 12 meses.
> Investigue onde o desconto é aplicado e por que esse caso escaparia.

Quando o plano estiver pronto: `Aprovar e executar` (dispara o modo agente), `Salvar em arquivo
temporário`, ou publicar no Confluence / Azure DevOps Wiki.

Se a investigação confirmar o bug, o caminho formal é a **Etapa 3** com a operação `Correção de bug
de implementação` — assim a correção nasce com spec, casos de teste e tasks.

## 3.5 · Etapa 3 — gerar a especificação

Menu → **Gerar especificações (Etapa 3)**. É a etapa que mais roda no dia a dia: uma vez por unidade
de trabalho (uma feature, um bug, um domínio inteiro).

1. **Tipo de operação:**
   - `Nova funcionalidade em domínio existente`
   - `Nova funcionalidade envolvendo múltiplos domínios` ← o caso típico aqui, backend + microfrontend
   - `Especificar domínio de negócio inteiro, já documentado, mas ainda não implementado`
   - `Correção de bug de implementação`
   - `Correção de bug de especificação`
2. **Domínio(s) onde a mudança incide** — a lista sai do mapa que o curador publicou.
3. **Descreva a feature ou a correção** — texto livre; pode citar caminhos de arquivos e o documento
   de intenção salvo no modo descoberta:
   > Conforme `.agents/tmp/intencao-aprovacao-em-lote.md`: permitir aprovação em lote de pedidos
   > represados por alçada. Backend em `repositories/billing-service`, tela em
   > `repositories/billing-service-mf`, regra de alçada em `repositories/pricing-rules`.
4. **Instruções adicionais** (opcional).
5. O agente gera em rodadas, com **aprovação humana em cada uma**: especificação → plano de
   implementação → casos de teste → tasks.

Sai em `.agents/specs/<numero-slug>/`, com `spec.md`, o plano, `test-cases.md` e `tasks.md`. A CLI
reinicia a sessão do agente entre specs para garantir contexto isolado. Um PO pode parar aqui: a spec
aprovada é a demanda pronta.

> Nada atravessa um checkpoint sem sua aprovação. `Solicitar correção` aceita texto livre — use
> quando o agente entendeu o escopo errado, em vez de aprovar e consertar depois.

## 3.6 · Etapa 4 — implementar (dev)

Menu → **Implementar tarefas (Etapa 4)**.

1. **Selecione a spec** (ordem por número; specs já implementadas aparecem separadas).
2. **Marque as tasks** da rodada. A tela mostra `X de Y tasks concluídas` e as dependências. Marcar
   uma task com dependência pendente exige confirmação explícita (`Implementar mesmo assim`).
3. O agente implementa e para em um **checkpoint por task**, mostrando arquivos alterados (com o
   caminho começando em `repositories/<repo>/…`), verificações automáticas com o resultado de cada
   uma, casos de teste impactados, documentação autoritativa atualizada e sugestões de trabalho
   adiável.
4. Você **Aprova e continua**, **Solicita correção**, ou dispara **Criar Pull Request** / **Revisar
   código** direto do checkpoint.

**O código alterado fica em `repositories/<repo>` e pertence ao git daquele repositório** — o central
não versiona nada disso. Por repositório tocado:

```powershell
cd repositories\billing-service
git switch -c feature/SQUAD-1234-aprovacao-em-lote
git add . ; git commit -m "feat: aprovação em lote de pedidos represados"
git push -u origin HEAD
cd ..\..
```

## 3.7 · Abrir o Pull Request

Menu → **Criar Pull Request**. O formulário pede branch de origem, branch de destino e um resumo; o
agente gera a descrição (usando o template de PR do projeto, se houver) e publica no provedor após
sua aprovação.

Como as branches são do repositório de produto — e não do central —, abra a CLI apontando para ele:

```powershell
clovis --cwd C:\Projetos\squad-workspace\repositories\billing-service
```

Os utilitários exigem apenas um agente configurado; não dependem da descoberta.

Convenção que paga o investimento: **cite o diretório da spec na descrição de cada PR** —
`.agents/specs/0012-aprovacao-em-lote/`. É o que mantém o PR do backend e o do microfrontend
rastreáveis à mesma decisão.

## 3.8 · Revisar código

Menu → **Revisão de código agêntica**. Dois modos:

- **Local** — compara duas branches (origem e destino), com campos opcionais de descrição e de
  restrições (ex.: *ignore o diretório `dist/`, foque em arquivos `.css`*). Gera um markdown
  consolidado.
- **Pull Request** — a partir do link do PR; publica os comentários selecionados direto no provedor.

Ele pergunta se deve **rodar o projeto, os testes e os checks de qualidade** durante a revisão:
aumenta a confiança dos achados e consome mais tokens. Os achados vêm com severidade (Alta / Média /
Baixa) e **você seleciona quais publicar** — dá para pedir ajuste em um comentário específico antes.

Vale o mesmo do PR: aponte a CLI para o repositório de produto com `--cwd`.

## 3.9 · Diagnóstico do harness

Menu → **Diagnóstico do harness**. Audita o repositório e devolve um score de saúde para operação por
agentes: o que está documentado, o que falta e o que atrapalha. Útil quando as respostas do agente
começam a ficar genéricas — normalmente é sinal de que um domínio novo entrou sem passar pela
documentação, e é hora de acionar o curador.

---

# Parte 4 — Devolver os artefatos ao central

O código vai para o git de cada repositório. **A spec vai para o central** — é o que faz o
conhecimento acumular em vez de evaporar no fim da sprint.

```powershell
# na raiz de squad-workspace
git add .agents/specs
git commit -m "docs: spec 0012 — aprovação em lote de pedidos"
git push
```

Se `main` do central for protegida, abra PR também aqui — o que, aliás, dá revisão humana na spec
antes de virar código.

Regra de bolso do que é de quem (versão completa em
[papéis e responsabilidades](papeis-e-responsabilidades.md)):

| Artefato | Vive em | Você commita em |
| --- | --- | --- |
| Spec, plano, casos de teste, tasks | `.agents/specs/` | central |
| Código-fonte | `repositories/<repo>` | o git daquele repositório |
| Mapa funcional, `AGENTS.md`, skills | `.agents/`, raiz | central — **produzido pelo curador** |

---

# Parte 5 — O que não fazer

- **Não rode as Etapas 1 e 2** por conta própria. Elas regeram o mapa funcional e a documentação de
  domínio que a squad inteira usa. Se faltar um domínio, acione o curador.
- **Não abra o Clovis dentro de `repositories/<repo>`** para o fluxo spec-driven. Ali ele perde o
  mapa, as skills e a visão cross-repo — que é o motivo de o repositório central existir. A exceção
  são os utilitários de PR e code review, que trabalham nas branches do repositório de produto.
- **Não commite `repositories/` no central.** Ele está no `.gitignore` por desenho: cada clone tem o
  próprio `.git`, e versioná-lo criaria entradas quebradas para todo mundo.
- **Não aprove checkpoint por cansaço.** `Solicitar correção` existe justamente para isso, e sai mais
  barato que consertar código depois.
- **Não deixe a spec só na sua máquina.** Sem o commit no central, a próxima pessoa recomeça do zero.

---

# Anexo — Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| Etapas 2, 3 e 4 desabilitadas: "Requer a descoberta concluída (Etapa 1)" | você clonou antes de o curador publicar | `git pull` na raiz do central |
| Menu inteiro desabilitado: "Requer um agente de IA configurado" | nenhum agente no PATH | instale e autentique o agente, e confirme com `clovis` → **Reconfigurar agente de código** |
| "Diretório sem repositório git" ao abrir o Clovis | CLI aberta fora do central | `cd` para a raiz de `squad-workspace` ou use `--cwd` |
| "Sem permissão para criar o link" no `init` | Windows sem Modo de Desenvolvedor | ative o Modo de Desenvolvedor e rode `npm run link:skills` |
| `git pull` + `npm run clone` e o código continua velho | `clone` só provisiona o que falta | use `npm run clone:update` |
| `clone:update`: "fetch feito, sem avanço — alterações locais não commitadas" | working tree suja | commite ou `git stash` dentro daquele repositório |
| `clone:update`: "sem upstream" / "HEAD destacado" | branch não publicada ou checkout de commit | `git switch <branch>` ou `git push -u origin HEAD` |
| O agente não acha um arquivo que existe em `repositories/` | busca de agente ignora caminhos gitignorados | cite o caminho completo no prompt |
| Faltam repositórios em `repositories/` | inventário atualizado por outra pessoa | `git pull` + `npm run clone` |
| Perdi a conversa livre ao sair | a conversa é transitória por desenho | salve ou publique o documento antes de encerrar |

Ajuda dos scripts:

```powershell
node scripts/clone-repositories.js --help
```
