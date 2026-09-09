import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Falha em vez de travar num prompt de credencial durante execuções paralelas. */
const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

/** Linhas que o git escreve em stderr durante uma operação bem-sucedida. */
const PROGRESS = /^(Cloning into|Enumerating objects|Counting objects|Compressing objects|Receiving objects|Resolving deltas|Updating files|Total \d|From |warning:)/;

/**
 * O git mistura, em stderr, o progresso da operação e a resposta do servidor —
 * esta enfeitada com prefixos `remote:`, linhas vazias e réguas de `=`. Isola a
 * primeira linha que carrega a causa real da falha.
 */
function firstMeaningfulLine(output) {
  return output
    .split('\n')
    .map((line) => line.replace(/^remote:\s?/, '').trim())
    .find((line) => line.length > 0 && !/^=+$/.test(line) && !PROGRESS.test(line));
}

export class GitError extends Error {
  constructor(command, cause) {
    const output = cause.stderr || cause.stdout || cause.message || '';
    super(firstMeaningfulLine(output) || `Falha ao executar: git ${command.join(' ')}`);
    this.name = 'GitError';
    this.command = command;
  }
}

async function git(args, { cwd } = {}) {
  try {
    return await run('git', args, { cwd, env: gitEnv, maxBuffer: 32 * 1024 * 1024 });
  } catch (cause) {
    throw new GitError(args, cause);
  }
}

/** Erro imediato e legível quando o git não está no PATH. */
export async function assertGitAvailable() {
  try {
    await run('git', ['--version'], { env: gitEnv });
  } catch {
    throw new Error('git não encontrado no PATH. Instale o git antes de rodar este script.');
  }
}

export async function isGitWorkTree(dir) {
  try {
    await access(path.join(dir, '.git'));
    return true;
  } catch {
    return false;
  }
}

export async function cloneRepository({ url, targetDir, branch, depth }) {
  const args = ['clone'];
  if (branch) args.push('--branch', branch);
  if (depth) args.push('--depth', String(depth), '--shallow-submodules');
  args.push('--', url, targetDir);
  await git(args);
}

export async function currentBranch(dir) {
  try {
    const { stdout } = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: dir });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function hasLocalChanges(dir) {
  const { stdout } = await git(['status', '--porcelain'], { cwd: dir });
  return stdout.trim().length > 0;
}

async function upstreamOf(dir) {
  try {
    const { stdout } = await git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
      cwd: dir,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Sincroniza um clone existente: sempre busca do remote e só avança a branch
 * local quando o fast-forward é seguro. Working tree suja, HEAD destacado ou
 * branch sem upstream interrompem o avanço e viram o motivo devolvido.
 */
export async function updateRepository(dir) {
  await git(['fetch', '--all', '--prune', '--tags'], { cwd: dir });

  const branch = await currentBranch(dir);
  if (!branch) {
    return { fetched: true, fastForwarded: false, reason: 'HEAD destacado' };
  }

  if (await hasLocalChanges(dir)) {
    return { fetched: true, fastForwarded: false, branch, reason: 'alterações locais não commitadas' };
  }

  const upstream = await upstreamOf(dir);
  if (!upstream) {
    return { fetched: true, fastForwarded: false, branch, reason: `${branch} sem upstream` };
  }

  const { stdout: behind } = await git(['rev-list', '--count', `HEAD..${upstream}`], { cwd: dir });
  if (Number(behind.trim()) === 0) {
    return { fetched: true, fastForwarded: false, branch, reason: 'já atualizado' };
  }

  await git(['merge', '--ff-only', upstream], { cwd: dir });
  return { fetched: true, fastForwarded: true, branch, commits: Number(behind.trim()) };
}
