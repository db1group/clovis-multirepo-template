#!/usr/bin/env node
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { ConfigError, loadRepositories, repositoriesDir } from './lib/config.js';
import { assertGitAvailable, cloneRepository, isGitWorkTree, updateRepository } from './lib/git.js';
import { logger, paint } from './lib/logger.js';
import { projectRoot } from './lib/paths.js';

const USAGE = `
${paint('bold', 'clone-repositories')} — clona em repositories/ os repositórios declarados em repositories.json

${paint('bold', 'Uso')}
  node scripts/clone-repositories.js [opções] [nome...]
  npm run clone -- [opções] [nome...]

${paint('bold', 'Opções')}
  -o, --only <nome>     Restringe a um repositório (repetível; equivale a passar o nome solto)
  -u, --update          Atualiza (fetch + fast-forward) os clones que já existem
  -c, --concurrency <n> Clones simultâneos (padrão: 4)
      --depth <n>       Clone raso com histórico truncado em n commits
      --dry-run         Mostra o que seria feito, sem tocar no disco
  -l, --list            Lista o inventário e sai
  -h, --help            Mostra esta ajuda

${paint('bold', 'Exemplos')}
  npm run clone                        # clona tudo o que ainda falta
  npm run clone -- --update            # clona o que falta e sincroniza o resto
  npm run clone -- --depth 1 core-service   # clone raso de um repositório específico
`;

function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      only: { type: 'string', short: 'o', multiple: true, default: [] },
      update: { type: 'boolean', short: 'u', default: false },
      concurrency: { type: 'string', short: 'c', default: '4' },
      depth: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      list: { type: 'boolean', short: 'l', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  const positiveInteger = (raw, flag) => {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`--${flag} espera um inteiro positivo, recebeu "${raw}".`);
    }
    return parsed;
  };

  return {
    names: [...values.only, ...positionals],
    update: values.update,
    concurrency: positiveInteger(values.concurrency, 'concurrency'),
    depth: values.depth === undefined ? null : positiveInteger(values.depth, 'depth'),
    dryRun: values['dry-run'],
    list: values.list,
    help: values.help,
  };
}

/** Aplica filtro por nome e recusa referências inexistentes. */
function selectRepositories({ repositories }, options) {

  const knownNames = new Set(repositories.map((repository) => repository.name));
  const unknownNames = options.names.filter((name) => !knownNames.has(name));
  if (unknownNames.length > 0) {
    throw new Error(`Repositório desconhecido: ${unknownNames.join(', ')}`);
  }

  return repositories.filter((repository) => {
    const matchesName = options.names.length === 0 || options.names.includes(repository.name);
    return matchesName;
  });
}

function printInventory({ repositories }) {
  if (repositories.length === 0) {
    logger.warn('Inventário vazio: nenhum repositório declarado em repositories.json.');
    return;
  }

  logger.blank();
  logger.title(`Repositórios ${paint('dim', '(' + String(repositories.length) + ')')}`);
  for (const repository of repositories) {
    const branch = repository.branch ? paint('dim', ` [${repository.branch}]`) : '';
    logger.plain(`  ${repository.name}${branch}`);
    logger.dim(`    ${repository.url}`);
  }
  logger.blank();
}

async function isEmptyDirectory(dir) {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}

async function processRepository(repository, options) {
  const targetDir = path.join(repositoriesDir, repository.name);
  const label = paint('bold', repository.name);
  const outcome = (status, detail) => ({ ...repository, status, detail });

  if (await isGitWorkTree(targetDir)) {
    if (!options.update) {
      logger.skip(`${repository.name}: já clonado`);
      return outcome('skipped', 'já clonado');
    }

    if (options.dryRun) {
      logger.step(`${label}: atualizaria (fetch + fast-forward)`);
      return outcome('skipped', 'atualizaria');
    }

    const result = await updateRepository(targetDir);
    if (result.fastForwarded) {
      const detail = `${result.branch} avançou ${result.commits} commit(s)`;
      logger.success(`${label}: ${detail}`);
      return outcome('updated', detail);
    }
    logger.skip(`${repository.name}: fetch feito, sem avanço — ${result.reason}`);
    return outcome('skipped', `fetch feito — ${result.reason}`);
  }

  if (!(await isEmptyDirectory(targetDir))) {
    throw new Error(
      `repositories/${repository.name} já existe e não é um clone git. Remova ou renomeie o diretório.`,
    );
  }

  if (options.dryRun) {
    logger.step(`${label}: clonaria de ${repository.url}`);
    return outcome('cloned', 'clonaria');
  }

  logger.step(`${label}: clonando…`);
  await cloneRepository({
    url: repository.url,
    targetDir,
    branch: repository.branch,
    depth: options.depth,
  });
  logger.success(`${label}: clonado em repositories/${repository.name}`);
  return outcome('cloned', `repositories/${repository.name}`);
}

const REPORT_SECTIONS = [
  { status: 'cloned', title: 'Clonados', color: 'green' },
  { status: 'updated', title: 'Atualizados', color: 'green' },
  { status: 'skipped', title: 'Sem alteração', color: 'dim' },
];

/**
 * Relatório final: o percurso é resiliente — uma falha isolada não interrompe os
 * demais repositórios —, então é aqui que o resultado de cada um fica visível,
 * com a mensagem de erro completa de quem falhou.
 */
function printReport(results) {
  logger.blank();
  logger.title('Relatório');

  for (const section of REPORT_SECTIONS) {
    const rows = results.filter((result) => result.status === section.status);
    if (rows.length === 0) continue;

    logger.blank();
    logger.plain(paint(section.color, `${section.title} (${rows.length})`));
    for (const row of rows) {
      const suffix = row.detail ? paint('dim', ` — ${row.detail}`) : '';
      logger.plain(`  ${row.name}${suffix}`);
    }
  }

  const failures = results.filter((result) => result.status === 'failed');
  if (failures.length > 0) {
    logger.blank();
    logger.plain(paint('red', `Falhas (${failures.length})`));
    for (const failure of failures) {
      logger.plain(`  ${paint('bold', failure.name)}`);
      logger.plain(`    ${paint('red', failure.detail)}`);
      logger.dim(`    ${failure.url}`);
    }
  }

  const count = (status) => results.filter((result) => result.status === status).length;
  logger.blank();
  logger.title(
    `${count('cloned')} clonado(s) · ${count('updated')} atualizado(s) · ` +
      `${count('skipped')} sem alteração · ${failures.length} com falha`,
  );
}

/** Executa `worker` sobre `items` com no máximo `limit` execuções simultâneas. */
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runner = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const inventory = await loadRepositories();

  if (options.list) {
    printInventory(inventory);
    return 0;
  }

  const selected = selectRepositories(inventory, options);

  if (selected.length === 0) {
    logger.warn('Nenhum repositório selecionado. Use --list para ver o inventário.');
    return 0;
  }

  await assertGitAvailable();
  if (!options.dryRun) {
    await mkdir(repositoriesDir, { recursive: true });
  }

  logger.title(
    `${selected.length} repositório(s) → ${path.relative(projectRoot, repositoriesDir)}/` +
      (options.dryRun ? paint('yellow', ' (dry-run)') : ''),
  );
  logger.blank();

  const results = await runPool(selected, options.concurrency, async (repository) => {
    try {
      return await processRepository(repository, options);
    } catch (error) {
      logger.error(`${repository.name}: ${error.message}`);
      return { ...repository, status: 'failed', detail: error.message };
    }
  });

  printReport(results);

  return results.some((result) => result.status === 'failed') ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  if (error instanceof ConfigError) {
    logger.error(error.message);
    for (const issue of error.issues) logger.plain(`  - ${issue}`);
  } else {
    logger.error(error.message);
  }
  process.exitCode = 1;
}
