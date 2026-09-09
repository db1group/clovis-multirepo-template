import { styleText } from 'node:util';

/**
 * Aplica estilo ANSI respeitando o suporte a cores do stream de saída:
 * em pipe, arquivo ou com NO_COLOR o texto sai puro.
 */
const paint = (format, text) => styleText(format, text, { stream: process.stdout });

export const logger = {
  plain: (message) => console.log(message),
  dim: (message) => console.log(paint('dim', message)),
  title: (message) => console.log(paint('bold', message)),
  step: (message) => console.log(`${paint('cyan', '→')} ${message}`),
  success: (message) => console.log(`${paint('green', '✔')} ${message}`),
  skip: (message) => console.log(`${paint('dim', '·')} ${paint('dim', message)}`),
  warn: (message) => console.warn(`${paint('yellow', '!')} ${message}`),
  error: (message) => console.error(`${paint('red', '✖')} ${message}`),
  blank: () => console.log(''),
};

export { paint };
