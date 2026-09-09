import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { projectRoot } from './paths.js';

/** Inventário dos repositórios do produto. */
export const configPath = path.join(projectRoot, 'repositories.json');

/** Destino dos clones locais. */
export const repositoriesDir = path.join(projectRoot, 'repositories');

/** Nome de diretório seguro: minúsculas, sem separadores de caminho. */
const SLUG = /^[a-z0-9][a-z0-9._-]*$/;

export class ConfigError extends Error {
  constructor(issues) {
    super(`Inventário inválido em ${path.relative(projectRoot, configPath)}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

function validateRepository(repository, index, issues, seenNames) {
  const where = `repositories[${index}]`;

  if (!isPlainObject(repository)) {
    issues.push(`${where}: deve ser um objeto.`);
    return null;
  }

  if (!isNonEmptyString(repository.name)) {
    issues.push(`${where}.name: obrigatório (nome do diretório em repositories/).`);
  } else if (!SLUG.test(repository.name)) {
    issues.push(`${where}.name: "${repository.name}" não é um nome de diretório válido (use [a-z0-9._-]).`);
  } else if (seenNames.has(repository.name)) {
    issues.push(`${where}.name: "${repository.name}" duplicado — cada clone ocupa um diretório único.`);
  } else {
    seenNames.add(repository.name);
  }

  if (!isNonEmptyString(repository.url)) {
    issues.push(`${where}.url: obrigatório (URL do remote git).`);
  }

  if (repository.branch !== undefined && !isNonEmptyString(repository.branch)) {
    issues.push(`${where}.branch: quando presente, deve ser uma string não vazia.`);
  }

  if (repository.description !== undefined && typeof repository.description !== 'string') {
    issues.push(`${where}.description: quando presente, deve ser uma string.`);
  }

  return {
    name: repository.name,
    url: repository.url,
    branch: repository.branch ?? null,
    description: repository.description ?? '',
  };
}

/**
 * Lê o inventário e valida o formato em array simples: [{ name, url, ... }].
 */
export async function loadRepositories() {
  let raw;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch (cause) {
    throw new ConfigError([`Não foi possível ler o arquivo: ${cause.message}`]);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new ConfigError([`JSON malformado: ${cause.message}`]);
  }

  const issues = [];
  const seenNames = new Set();

  if (!Array.isArray(parsed)) {
    throw new ConfigError(['A raiz do arquivo deve ser um array de repositórios.']);
  }

  const repositories = parsed
    .map((repository, index) => validateRepository(repository, index, issues, seenNames))
    .filter(Boolean);

  if (issues.length > 0) {
    throw new ConfigError(issues);
  }

  return { repositories };
}
