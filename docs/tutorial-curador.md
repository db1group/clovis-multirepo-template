# Tutorial do curador — montar o repositório central

Passo a passo para montar o repositório central da squad a partir deste template e rodar as
**Etapas 1 e 2** do fluxo spec-driven do Clovis sobre os repositórios do time.

**A ideia em uma frase:** o Clovis roda **no repositório central**; os repositórios de código ficam
clonados dentro dele, em `repositories/`. Assim o agente enxerga backend e frontend na mesma sessão,
e o conhecimento (mapa funcional, `AGENTS.md`, skills, specs) fica versionado em um lugar só — sem
que nenhum repositório de produto perca o próprio ciclo de vida (branch, release, pipeline).

```
squad-workspace/               ← Clovis roda AQUI (cwd)
├── .clovis/                   ← estado da CLI (versionado: cli-state.json)
├── .agents/
│   ├── maps/functional-map.md ← Etapa 1
│   ├── skills/                ← Etapa 2  (.claude/skills aponta para cá)
│   └── specs/                 ← Etapa 3
├── AGENTS.md                  ← Etapa 2
├── repositories.json          ← inventário da squad (versionado)
├── repositories/              ← clones, IGNORADOS pelo git daqui
│   ├── core-service/              ← git próprio
│   ├── core-service-mf/           ← git próprio
│   └── …
└── scripts/
```

> Abrir o Clovis na pasta errada é o erro mais comum. O terminal precisa estar na raiz de
> `squad-workspace`, nunca dentro de `repositories/<repo>`.

> **Este documento é do curador.** Quem chega depois, com tudo já publicado — dev ou PO —, usa o
> [guia do dia a dia](guia-diario-squad.md). A fronteira entre os papéis está em
> [papéis e responsabilidades](papeis-e-responsabilidades.md).

Os exemplos usam `squad-workspace` como nome do repositório central e um inventário fictício de nove
serviços. Troque pelos nomes reais da sua squad — nada aqui depende desses nomes.

---

# Parte 1 — Fundação do repositório central

## Etapa 0 · Pré-requisitos da máquina

| Item | Verificação | Observação |
| --- | --- | --- |
| Node 24+ | `nvm use && node -v` | versão fixada em `.nvmrc` |
| git no PATH | `git --version` | |
| Acesso SSH aos remotes | `ssh -T git@github.com` | chave carregada no agente; sem isso o clone dos repositórios falha |
| Agente de IA no PATH | `copilot`, `claude`, `codex`, `cursor`, `junie` ou `devin` | o Clovis não substitui o agente, ele o conduz |
| Clovis CLI | `npm i -g @dgs-engineering/clovis && clovis --version` | login por SSO na primeira execução |
| MCP de documentação, **se a squad usar um** | o MCP responde no agente escolhido | necessário antes da Etapa 1, para declarar a fonte nas restrições |

## Etapa 1 · Criar o repositório central a partir do template

```powershell
cd C:\Projetos
git clone git@github.com:<org>/clovis-multirepo-template.git squad-workspace
cd squad-workspace

# desvincula do template e aponta para o repositório novo da squad
git remote remove origin
git remote add origin git@github.com:<org>/squad-workspace.git
```

Convenção sugerida: **um repositório central por squad**. O nome da pasta local é livre, mas
manter igual ao repositório evita confusão nos caminhos que aparecem nas specs.

## Etapa 2 · Declarar o inventário da squad

Substitua o conteúdo de `repositories.json` pelo inventário da squad, trocando `<org>` pela
organização real. O campo `description` é opcional, mas vale a pena: ele é a primeira pista de camada
que o agente lê ao abrir o inventário.

```json
[
  { "name": "shell-mf",           "url": "git@github.com:<org>/shell-mf.git",           "description": "Frontend — host dos microfrontends" },
  { "name": "identity-service",   "url": "git@github.com:<org>/identity-service.git",   "description": "Backend" },
  { "name": "catalog-service",    "url": "git@github.com:<org>/catalog-service.git",    "description": "Backend" },
  { "name": "catalog-service-mf", "url": "git@github.com:<org>/catalog-service-mf.git", "description": "Frontend" },
  { "name": "pricing-service",    "url": "git@github.com:<org>/pricing-service.git",    "description": "Backend" },
  { "name": "pricing-rules",      "url": "git@github.com:<org>/pricing-rules.git",      "description": "Backend" },
  { "name": "pricing-service-mf", "url": "git@github.com:<org>/pricing-service-mf.git", "description": "Frontend" },
  { "name": "billing-service",    "url": "git@github.com:<org>/billing-service.git",    "description": "Backend" },
  { "name": "billing-service-mf", "url": "git@github.com:<org>/billing-service-mf.git", "description": "Frontend" },
  { "name": "platform-docs",      "url": "git@github.com:<org>/platform-docs.git",      "description": "Documentação — ADRs e guias de arquitetura" }
]
```

Regras do inventário (validadas pelo script, que falha com a lista de problemas):

- `name` vira o nome da pasta em `repositories/` — único e restrito a `[a-z0-9._-]`;
- `url` é o remote git com acesso já configurado na máquina;
- `branch` é opcional — use só quando a branch padrão do repositório não for a que a squad trabalha.

> **Se a squad mantém a documentação de arquitetura em um repositório** (ADRs, guias de padrão,
> diagramas), inclua-o no inventário como qualquer outro. Ele não é código de produto, mas ter o
> conteúdo em `repositories/` é o que permite apontá-lo nas restrições da Etapa 1 — ver
> [Declarar a documentação de arquitetura existente](#declarar-a-documentação-de-arquitetura-existente).

Valide antes de baixar o inventário inteiro:

```powershell
npm run clone -- --list      # imprime o inventário
npm run clone -- --dry-run   # mostra o que seria clonado, sem tocar no disco
```

## Etapa 3 · Provisionar o workspace

```powershell
nvm use
npm run init
```

O `init` roda duas preparações em sequência:

1. **Skills** — cria o link `.claude/skills → .agents/skills` (junction no Windows, symlink nos
   demais). É o caminho onde o agente procura as skills do projeto.
2. **Repositórios** — clona em `repositories/` tudo que está no inventário.

Em squads com dezenas de repositórios, vale aumentar a concorrência e/ou truncar o histórico:

```powershell
npm run init -- --concurrency 8
npm run init -- --depth 1        # clone raso: mais rápido, sem histórico completo
```

Uma falha isolada não interrompe os demais: no fim sai um relatório com clonados, atualizados, sem
alteração e com falha. Para reprocessar só quem falhou:

```powershell
npm run clone -- --only billing-service --only pricing-rules
```

## Etapa 4 · Verificar a fundação

```powershell
Get-ChildItem repositories | Measure-Object          # deve bater com o inventário
Get-Item .claude\skills | Select-Object LinkType,Target
git status                                           # repositories/ NÃO deve aparecer
```

`repositories/*` está no `.gitignore` do central por desenho: o código de produto pertence ao git de
cada repositório, não ao daqui. O porquê completo está em
[Por que `repositories/` está no `.gitignore`](#por-que-repositories-está-no-gitignore).

## Etapa 5 · Primeiro commit do central

```powershell
git add .
git commit -m "chore: inventário e bootstrap do repositório central"
git push -u origin main
```

Neste ponto o curador segue sozinho para a Parte 2. Só depois de publicar o mapa funcional, o
`AGENTS.md` e as skills é que vale chamar o resto da squad — antes disso, o menu do Clovis aparece
com as Etapas 2 a 4 desabilitadas para quem clonar.

---

# Parte 2 — Executando o Clovis no repositório central

Com o terminal na raiz de `squad-workspace`:

```powershell
clovis
```

(Alternativa sem trocar de diretório: `clovis --cwd C:\Projetos\squad-workspace`.)

## Etapa 0 · Configuração inicial (uma vez por máquina/projeto)

Na primeira execução o Clovis conduz uma sequência curta:

1. **Login** — abre uma URL, você informa o e-mail corporativo e conclui o SSO da organização.
2. **Agente de IA** — escolha entre os agentes encontrados no PATH.
3. **Modelo** e **nível de raciocínio** — publicados pelo próprio agente escolhido.
4. **Idioma da interface** e **idioma dos artefatos** — este template já vem com
   `.clovis/cli-state.json` fixando `artifactLanguage: "pt"`.
5. **Tipo de projeto (work mode)** — o template já vem com `workMode: "maintenance"`
   (*Manutenção / evolução — projeto existente em produção*), que é o caso de um ecossistema já no
   ar. Se a squad estiver começando um produto do zero, ajuste aqui.

Depois disso, o menu principal fica assim:

```
Fluxo spec-driven
  Descobrir nova intenção (Etapa 1)
  Gerar instruções e documentação autoritativa (Etapa 2)   ← desabilitado até a Etapa 1 concluir
  Gerar especificações (Etapa 3)                            ← idem
  Implementar tarefas (Etapa 4)                             ← idem
Utilitários
  Conversa livre com o agente
  Revisão de código agêntica
  Criar Pull Request
  Diagnóstico do harness
Ajustes
  Reconfigurar agente de código · Configurações · Sair da conta
```

> Opcional e recomendado antes de começar: rode **Diagnóstico do harness** para ver o score de saúde
> do repositório central. Ele mostra o que já está documentado, o que falta e o que atrapalha.

## Etapa 1 · Descoberta — mapear os domínios da squad

> **Curador, uma vez por projeto.** O resultado é publicado no central; ninguém mais precisa repetir.

**Isto é o que mais muda em um cenário multirepo:** não tente mapear dezenas de repositórios de uma
vez. O mapa funcional fica raso e a revisão humana vira impossível. Rode a Etapa 1 **em ondas**, uma
por produto ou capacidade, aproveitando que ela pode ser executada quantas vezes for necessário —
cada rodada *acrescenta* domínios ao índice.

Critérios para desenhar as ondas:

- agrupe por **produto ou capacidade de negócio**, não por camada — backend e microfrontend do mesmo
  domínio entram juntos;
- dimensione a onda pelo que você consegue **revisar com atenção** em uma sessão;
- comece pelo produto que a squad mais mexe: é o que dá retorno mais rápido.

Onda de exemplo, com o inventário deste tutorial:

| Onda | Produto / capacidade | Repositórios |
| --- | --- | --- |
| 1 | Precificação | `pricing-service`, `pricing-rules`, `pricing-service-mf` |
| 2 | Faturamento | `billing-service`, `billing-service-mf` |
| 3 | Catálogo | `catalog-service`, `catalog-service-mf` |
| 4 | Plataforma e entrada | `identity-service`, `shell-mf` |

O repositório de documentação (`platform-docs`, no inventário deste tutorial) não vira onda: ele não
é um domínio, é fonte de consulta — entra nas **restrições** de cada rodada.

Roteiro de cada onda, no menu → **Descobrir nova intenção (Etapa 1)**:

1. **O que deseja fazer?** → `Descobrir/atualizar domínios do projeto`.
   (As outras opções existem e são úteis depois: `Adicionar domínio a partir de fonte externa`, para
   puxar um domínio de um Confluence/PDF/URL; e `Importar domínios da documentação em skill
   existente`, que traz uma skill já escrita para o índice sem passar pelo agente.)
2. **Qual é o tipo de sistema?** → descreva a topologia real, por exemplo:
   > Ecossistema de microsserviços: backends de negócio e microfrontends (`-mf`) integrados por um
   > host. Cada serviço vive em um repositório próprio, clonado em `repositories/`.
3. **Qual é o escopo inicial?** → `Módulo / domínio específico`, e descreva a onda citando os
   caminhos:
   > Produto de precificação: `repositories/pricing-service`, `repositories/pricing-rules` e
   > `repositories/pricing-service-mf`.
4. **Restrições críticas** (opcional, mas é onde mora o maior ganho) → duas coisas entram aqui:

   **a) As regras que ninguém escreveu:**
   > Cada repositório mantém pipeline e release próprios. Não alterar assinatura de contratos REST
   > já publicados. Frontends `-mf` são microfrontends e não podem virar aplicação standalone.

   **b) Onde vive a documentação de arquitetura existente**, se houver. Declarar isso aqui faz o
   agente ler o material durante a descoberta e levá-lo em conta ao propor as **skills técnicas** —
   em vez de deduzir os padrões só a partir do código. Ver
   [Declarar a documentação de arquitetura existente](#declarar-a-documentação-de-arquitetura-existente).

5. O agente investiga e devolve **os domínios identificados com suas dependências** e as **skills
   técnicas identificadas**. Você **Aprova** ou **Solicita correção** em texto livre.

Saída em disco: `.agents/maps/functional-map.md`.

> Critério de aceite da Etapa 1: o mapa descreve o que está **no ar**, não o que se pretendia
> construir. Se aparecer um domínio que ninguém reconhece, é correção — não aprove por cansaço.

Repita para as demais ondas. Ao final, a Etapa 2 e as seguintes ficam liberadas no menu.

### Declarar a documentação de arquitetura existente

Muitos times já têm padrões escritos em algum lugar: ADRs, guia de estilo, contratos entre serviços,
diagramas C4, convenções de observabilidade. O agente não descobre isso sozinho — **você precisa
dizer onde está, no campo de restrições da Etapa 1.** O que estiver declarado ali é lido na
descoberta e vira insumo das skills técnicas geradas na Etapa 2; o que ficar de fora é reinventado a
partir do código.

A documentação costuma estar em uma destas três formas. Cada uma exige um preparo antes de rodar a
Etapa 1:

| Forma | Preparo antes da Etapa 1 | Como citar nas restrições |
| --- | --- | --- |
| **Repositório de documentação** (ADRs, guias, diagramas em markdown) | inclua o repositório em `repositories.json` e rode `npm run clone` — ele vira mais uma pasta em `repositories/` | pelo caminho: `repositories/<repo-de-docs>` |
| **MCP** (GitHub, Confluence, Notion, wiki corporativa, catálogo de serviços) | configure e autentique o MCP **no agente de IA**, antes de abrir o Clovis; confirme que ele responde | pelo nome do MCP e o que buscar nele |
| **Documentação acessível por URL ou arquivo** (wiki pública, PDF, página de padrões) | garanta que o agente consegue abrir a URL, ou baixe o arquivo para dentro do central | pela URL ou pelo caminho do arquivo |

Exemplos de restrição, combinando regras e fontes:

> A arquitetura da squad está documentada em `repositories/platform-docs`: ADRs em `docs/adr/`,
> padrão de serviço em `docs/backend-guidelines.md` e o contrato do host de microfrontends em
> `docs/mf-contract.md`. Trate esses documentos como fonte de verdade para padrões técnicos — onde o
> código divergir, registre a divergência em vez de promover o código a padrão.

> Os padrões técnicos estão no Confluence, acessível pelo MCP `atlassian`, no espaço `ARQ`
> (páginas "Padrões de API", "Observabilidade" e "Autenticação"). Consulte esse espaço antes de
> inferir convenções a partir do código.

> Guia de arquitetura em `https://<intranet>/arquitetura/padroes` e o catálogo de contratos em
> `repositories/platform-docs/openapi/`. Não alterar assinatura de contrato já publicado no catálogo.

Duas recomendações que evitam retrabalho:

- **Diga qual é a fonte de verdade quando código e documento divergirem.** Em caso de divergência entre documentações, sem essa instrução, o agente escolhe sozinho — e a escolha some no meio do
  mapa. Pedir que ele *registre a divergência* transforma o conflito em achado revisável.
- **Aponte para o recorte, não para a raiz.** "A wiki inteira" tende a diluir o contexto; seções e
  arquivos nomeados dão resultado melhor.

## Etapa 2 · Preparação — AGENTS.md e documentação autoritativa

> **Curador, uma vez por domínio.** Quando todos os domínios estiverem documentados, o projeto entra
> em modo manutenção e esta etapa quase não volta a rodar.

Menu → **Gerar instruções e documentação autoritativa (Etapa 2)**. É um hub com as opções:

1. **Fonte de documentação autoritativa** (perguntado antes do AGENTS.md):
   - `Skills locais` — a verdade passa a viver em `.agents/skills/` deste repositório central.
     Recomendado para começar.
   - `Outra fonte` — descreva onde ela vive (Confluence, wiki do Azure DevOps, um MCP, `/docs`),
     como está organizada e se há template padrão. O agente escreve a doc lá e deixa em
     `.agents/skills/` uma skill apontando para o destino.

2. **Gerar instruções para agentes (ex. AGENTS.md)** — consolida o `AGENTS.md` na raiz do central a
   partir do mapa funcional. Ele substitui o placeholder que vem no template. Revise com atenção
   redobrada: num multirepo, é aqui que devem ficar as regras que valem para **todos** os
   repositórios — onde fica cada coisa, como rodar build/test de um backend e de um microfrontend,
   convenções de branch e commit, e o aviso de que cada alteração pertence ao git do repositório em
   `repositories/`, não ao central.

3. **Gerar skills técnicas (transversais)** — geradas em lote, com desmarcação prévia do que não
   interessa. São os guias que valem fora de qualquer domínio: padrão de projeto do backend,
   padrão dos microfrontends, autenticação, observabilidade, contratos entre serviços.
   **A qualidade aqui depende do que você declarou nas restrições da Etapa 1:** se a squad tem
   documentação de arquitetura e ela foi apontada lá, as skills nascem alinhadas ao que já está
   escrito; se não foi, elas são deduzidas do código. Faltou declarar? Veja
   [Declarar a documentação de arquitetura existente](#declarar-a-documentação-de-arquitetura-existente).

4. **Gerar documentação autoritativa de domínio** — um domínio por vez, na ordem de implementação
   sugerida, com aprovação humana a cada um. Com muitos repositórios isso é uma maratona: faça por
   produto, na mesma ordem das ondas da Etapa 1. Domínio já gerado aparece marcado — selecioná-lo
   regenera.

5. **Verificar cobertura e concluir a preparação** — o agente confere se **cada decisão transversal
   tem um lar** (AGENTS.md, skill de domínio ou skill técnica) antes de liberar a Etapa 3. Dá para
   pular e ir direto para a Etapa 3, mas pular é justamente o que faz o agente reinventar convenção
   na sessão seguinte.

Saída em disco: `AGENTS.md` e `.agents/skills/`.

**Commite o resultado no central.** Este é o ativo que a squad passa a compartilhar:

```powershell
git add AGENTS.md .agents .clovis/cli-state.json
git commit -m "docs: mapa funcional, AGENTS.md e skills dos domínios da squad"
git push
```

## Liberar a squad

Com o mapa, o `AGENTS.md` e as skills publicados, o onboarding de qualquer pessoa passa a ser:

```powershell
git clone git@github.com:<org>/squad-workspace.git
cd squad-workspace
nvm use
npm run init      # link de skills + clone dos repositórios do inventário
clovis            # Etapa 0 na própria máquina: login, agente, modelo
```

Depois disso a pessoa já tem, na mesma máquina, todos os repositórios e o conhecimento acumulado
pelo time — e entra direto na **Etapa 3**, sem repetir descoberta nem preparação. O resto do fluxo
dela está no [guia do dia a dia](guia-diario-squad.md).

---

# Parte 3 — Manutenção do harness

Depois da fundação, o trabalho do curador é pontual: manter mapa, documentação e inventário
alinhados com a realidade.

## Quando reabrir as Etapas 1 e 2

| Gatilho | O que fazer |
| --- | --- |
| Apareceu um domínio de negócio que o mapa não cobre | Etapa 1 **só para o escopo novo**, depois Etapa 2 para o domínio, e publique |
| Entrou um repositório novo na squad | adicione em `repositories.json`, `npm run clone -- --dry-run`, `npm run clone`, commite o inventário; avalie se é domínio novo |
| Saiu um repositório da squad | remova do `repositories.json`, apague a pasta em `repositories/` manualmente e ajuste as skills que o citavam |
| Refatoração grande mudou fronteiras de domínio | Etapa 1 no escopo afetado (a rodada atualiza o índice) + Etapa 2 nos domínios envolvidos |
| A documentação de arquitetura mudou, ou só apareceu depois da descoberta | Etapa 1 no escopo afetado **declarando a fonte nas restrições**, e regenere as skills técnicas na Etapa 2 |
| Squad relata que o agente "não sabe mais" de um domínio | **Diagnóstico do harness** e, conforme o achado, Etapa 2 no domínio |
| O agente reinventa uma convenção já decidida | a decisão não tem lar: acrescente ao `AGENTS.md` ou a uma skill técnica |

## Sincronizar: `git pull`, `clone` e `clone:update`

São três coisas diferentes, e confundi-las é a principal fonte de "mas eu atualizei e o código estava
velho":

| Comando | O que atualiza | O que **não** faz |
| --- | --- | --- |
| `git pull` (na raiz do central) | artefatos do central: `.agents/`, `AGENTS.md`, `repositories.json`, `scripts/` | não toca em `repositories/` — os clones são ignorados pelo git daqui |
| `npm run clone` | **provisiona o que ainda não existe** em `repositories/` | não atualiza clone existente; ele é reportado como "já clonado" e pulado |
| `npm run clone:update` | sincroniza os clones existentes (`fetch --all --prune --tags` + `merge --ff-only`) e clona o que faltar | não sobrescreve trabalho local |

A rotina completa de "quero tudo em dia" é, portanto, **dois comandos**:

```powershell
git pull              # conhecimento da squad + inventário
npm run clone:update  # código dos repositórios (clona o que faltar e avança o resto)
```

`clone:update` é deliberadamente conservador — ele **sempre busca**, mas **só avança** quando o
fast-forward é seguro. Ele não avança, e diz o motivo no relatório, quando o repositório tem:

- **alterações locais não commitadas** — nada é sobrescrito;
- **HEAD destacado**;
- **branch sem upstream** (ex.: uma `feature/` ainda não publicada).

E ele avança **a branch em que o clone está**, não a branch padrão. Se você deixou `pricing-service`
numa `feature/...`, é ela que anda — a `main` local continua onde estava. Para garantir que um
repositório específico está na última versão da branch padrão:

```powershell
cd repositories\pricing-service
git switch main
cd ..\..
npm run clone:update -- --only pricing-service
```

## Por que `repositories/` está no `.gitignore`

Não é economia de espaço — é o que torna o modelo viável:

- **Sem isso o git quebra.** Cada clone tem o próprio `.git`, então `git add .` não versiona os
  arquivos: cria uma entrada *gitlink* (modo `160000`) sem `.gitmodules`. Quem clonar o central
  recebe pastas vazias e um `git status` permanentemente sujo.
- **Controle de acesso.** Espelhar código de produto no repositório da squad contorna as permissões
  de cada repositório de origem.
- **Ciclo de vida próprio.** Branch protection, CODEOWNERS, release e pipeline vivem em cada
  repositório; duplicar o código cria duas fontes da verdade.
- **Volume.** Dezenas de históricos dentro de um repositório que deveria carregar só markdown.

A alternativa seria **git submodules** — o jeito "git correto" de referenciar repositórios, mas ele
fixa um commit, e o que a squad quer é a última versão da branch. `repositories.json` + script
entrega o mesmo provisionamento sem detached HEAD nem `--recurse-submodules`, ao custo de não pinar
versão. Para este uso, é o trade-off certo.

> **Atenção ao escrever o `AGENTS.md` (Etapa 2):** várias ferramentas de busca usadas por agentes
> (ripgrep e derivados) **ignoram caminhos gitignorados por padrão**. Se o agente parecer não
> enxergar o código, é quase sempre isso. Deixe explícito no `AGENTS.md` que `repositories/` é
> ignorado pelo git do central, mas é **o código-alvo** e deve ser lido normalmente.

---

# Anexo — Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| Etapas 2, 3 e 4 desabilitadas com "Requer a descoberta concluída (Etapa 1)" | mapa funcional ainda não existe | rode a Etapa 1 |
| Menu inteiro desabilitado com "Requer um agente de IA configurado" | nenhum agente no PATH | instale/logue o agente (`copilot`, `claude`, `codex`, `cursor`, `junie`, `devin`) |
| "Sem permissão para criar o link" no `link:skills` | Windows sem Modo de Desenvolvedor | ative o Modo de Desenvolvedor e rode `npm run link:skills` |
| `.claude/skills existe e não é um link` | pasta real criada por engano | remova/renomeie a pasta e rode `npm run link:skills` |
| `repositories/<nome> já existe e não é um clone git` | pasta manual ocupando o destino | remova ou renomeie o diretório |
| `Repositório desconhecido: X` | `--only` com nome fora do inventário | `npm run clone -- --list` e confira a grafia |
| `Inventário inválido` com lista de problemas | JSON malformado ou `name`/`url` faltando | corrija `repositories.json` e valide com `--dry-run` |
| "Diretório sem repositório git" ao abrir o Clovis | CLI aberta fora do central | `cd` para a raiz de `squad-workspace` (ou use `--cwd`) |
| O clone do inventário demora demais | histórico completo | `npm run clone -- --depth 1 --concurrency 8` |
| Rodou `git pull` + `npm run clone` e o código continua velho | `clone` só provisiona o que falta | use `npm run clone:update` |
| `clone:update` reporta "fetch feito, sem avanço — alterações locais não commitadas" | working tree suja | commite ou guarde (`git stash`) dentro daquele repositório |
| `clone:update` reporta "sem upstream" ou "HEAD destacado" | branch local não publicada ou checkout de commit | `git switch <branch>` / publique a branch (`git push -u origin HEAD`) |
| O agente não encontra arquivos que existem em `repositories/` | busca do agente ignora caminhos gitignorados | reforce no `AGENTS.md` que `repositories/` é o código-alvo; cite o caminho completo no prompt |
| As skills técnicas ignoram padrões que a squad já tem documentados | a fonte não foi declarada nas restrições da Etapa 1 | rode a Etapa 1 de novo no mesmo escopo, agora declarando a fonte, e regenere as skills técnicas na Etapa 2 |
| O agente não consegue abrir a documentação citada nas restrições | MCP não autenticado, URL sem acesso, repositório de docs fora do inventário ou Copilot Space inexistente | valide o acesso fora do Clovis primeiro; se for clone, inclua no `repositories.json` e rode `npm run clone`; se for MCP, reautentique e confirme que ele responde para aquele repositório/space |
| `git status` do central mostra `repositories/` como modificado | `.gitignore` alterado ou clone feito fora de `repositories/` | restaure `/repositories/*` no `.gitignore` |

Ajuda completa do script de clone:

```powershell
node scripts/clone-repositories.js --help
```
