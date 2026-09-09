import path from 'node:path';

/** Raiz do repositório, a partir de scripts/lib/. */
export const projectRoot = path.resolve(import.meta.dirname, '..', '..');
