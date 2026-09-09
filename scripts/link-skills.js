#!/usr/bin/env node
import { lstat, mkdir, realpath, rmdir, symlink, unlink } from 'node:fs/promises';
import path from 'node:path';

import { logger, paint } from './lib/logger.js';
import { projectRoot } from './lib/paths.js';

const skillsDir = path.join(projectRoot, '.agents', 'skills');
const claudeDir = path.join(projectRoot, '.claude');
const linkPath = path.join(claudeDir, 'skills');

const isWindows = process.platform === 'win32';

/**
 * No Windows, symlink de diretório exige Modo de Desenvolvedor ou elevação, e a
 * junction cobre o mesmo caso sem privilégio nenhum — em troca de aceitar apenas
 * alvo absoluto. Nos demais sistemas o alvo relativo mantém o link válido depois
 * de mover o repositório de lugar.
 */
const linkTarget = isWindows ? skillsDir : path.relative(claudeDir, skillsDir);
const linkType = isWindows ? 'junction' : 'dir';

async function inspect(target) {
  try {
    const stats = await lstat(target);
    return stats.isSymbolicLink() ? 'link' : 'ocupado';
  } catch (error) {
    if (error.code === 'ENOENT') return 'ausente';
    throw error;
  }
}

async function resolvesToSkills() {
  try {
    return (await realpath(linkPath)) === (await realpath(skillsDir));
  } catch {
    return false;
  }
}

async function removeLink() {
  try {
    await unlink(linkPath);
  } catch (error) {
    // Junction do Windows não cede a unlink; rmdir remove o vínculo sem tocar no alvo.
    if (error.code === 'EPERM' || error.code === 'EISDIR') await rmdir(linkPath);
    else throw error;
  }
}

async function main() {
  await mkdir(skillsDir, { recursive: true });

  const state = await inspect(linkPath);

  if (state === 'ocupado') {
    logger.error('.claude/skills existe e não é um link. Remova ou renomeie antes de rodar este script.');
    return 1;
  }

  if (state === 'link') {
    if (await resolvesToSkills()) {
      logger.success(`.claude/skills ${paint('dim', '→')} .agents/skills`);
      return 0;
    }
    await removeLink();
  }

  await mkdir(claudeDir, { recursive: true });

  try {
    await symlink(linkTarget, linkPath, linkType);
  } catch (error) {
    if (error.code === 'EPERM') {
      logger.error('Sem permissão para criar o link. No Windows, ative o Modo de Desenvolvedor ou rode o terminal como administrador.');
      return 1;
    }
    throw error;
  }

  logger.success(`.claude/skills ${paint('dim', '→')} ${linkTarget}`);
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  logger.error(error.message);
  process.exitCode = 1;
}
