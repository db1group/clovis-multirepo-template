#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

import { logger, paint } from './lib/logger.js';
import { projectRoot } from './lib/paths.js';

const USAGE = `
${paint('bold', 'init')} — prepara o repositório para uso: liga as skills e provisiona os clones

${paint('bold', 'Uso')}
  node scripts/init.js [opções do clone]
  npm run init -- [opções do clone]

Sem opções próprias: tudo o que vier na linha de comando é repassado à etapa de
clone. \`node scripts/clone-repositories.js --help\` lista o que ela aceita.

${paint('bold', 'Exemplos')}
  npm run init                        # liga as skills e clona tudo o que falta
  npm run init -- --depth 1           # primeira carga mais rápida, histórico truncado
  npm run init -- --only core-service # restringe o clone a um repositório
`;

const STEPS = [
  { title: 'Skills', script: 'link-skills.js', forwardsArgs: false },
  { title: 'Repositórios', script: 'clone-repositories.js', forwardsArgs: true },
];

/**
 * Cada etapa roda em seu próprio processo, com a saída herdada: o relatório que
 * ela já sabe emitir chega inteiro ao terminal. `process.execPath` dispensa
 * shell e PATH, o que mantém o comportamento igual nos três sistemas.
 */
function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(projectRoot, 'scripts', script), ...args], {
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(USAGE);
    return 0;
  }

  const results = [];

  // Uma etapa que falha não impede a seguinte: o link quebrado e os clones são
  // problemas independentes, e o relatório final mostra os dois de uma vez.
  for (const step of STEPS) {
    logger.blank();
    logger.title(`── ${step.title} ${'─'.repeat(Math.max(0, 56 - step.title.length))}`);
    logger.blank();
    results.push({ ...step, code: await run(step.script, step.forwardsArgs ? args : []) });
  }

  logger.blank();
  logger.title('Init');
  for (const result of results) {
    const ok = result.code === 0;
    logger.plain(`  ${paint(ok ? 'green' : 'red', ok ? '✔' : '✖')} ${result.title}`);
  }

  return results.some((result) => result.code !== 0) ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  logger.error(error.message);
  process.exitCode = 1;
}
