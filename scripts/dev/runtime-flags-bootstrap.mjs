import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_PATHS = Object.freeze({
  indexPath: resolve('src/index.html'),
  runtimeFlagsPath: resolve('src/assets/runtime-flags.js'),
});
const RUNTIME_FLAGS_SCRIPT_SRC = 'assets/runtime-flags.js';
const RUNTIME_FLAGS_SCRIPT_TAG = `  <script src="${RUNTIME_FLAGS_SCRIPT_SRC}"></script>`;
const HEAD_END_TAG = '</head>';

export function injectRuntimeFlagsBootstrap(indexHtml) {
  const doubleQuotedSource = `src="${RUNTIME_FLAGS_SCRIPT_SRC}"`;
  const singleQuotedSource = `src='${RUNTIME_FLAGS_SCRIPT_SRC}'`;

  if (indexHtml.includes(doubleQuotedSource) || indexHtml.includes(singleQuotedSource)) {
    return indexHtml;
  }

  const headEndIndex = indexHtml.indexOf(HEAD_END_TAG);
  if (headEndIndex < 0) {
    throw new Error(`Cannot install runtime flags: ${HEAD_END_TAG} is missing from src/index.html.`);
  }

  return `${indexHtml.slice(0, headEndIndex)}${RUNTIME_FLAGS_SCRIPT_TAG}\n${indexHtml.slice(headEndIndex)}`;
}

export async function installRuntimeFlagsBootstrap(runtimeFlagsContent, paths = DEFAULT_PATHS) {
  const [originalIndex, originalRuntimeFlags] = await Promise.all([
    readFile(paths.indexPath, 'utf-8'),
    readFile(paths.runtimeFlagsPath, 'utf-8'),
  ]);
  const bootstrappedIndex = injectRuntimeFlagsBootstrap(originalIndex);
  let runtimeFlagsWritten = false;
  let indexWritten = false;

  try {
    await writeFile(paths.runtimeFlagsPath, runtimeFlagsContent, { encoding: 'utf-8' });
    runtimeFlagsWritten = true;
    await writeFile(paths.indexPath, bootstrappedIndex, { encoding: 'utf-8' });
    indexWritten = true;
  } catch (error) {
    const restorations = [];

    if (runtimeFlagsWritten) {
      restorations.push(
        writeFile(paths.runtimeFlagsPath, originalRuntimeFlags, { encoding: 'utf-8' }),
      );
    }

    if (indexWritten) {
      restorations.push(writeFile(paths.indexPath, originalIndex, { encoding: 'utf-8' }));
    }

    await Promise.allSettled(restorations);
    throw error;
  }

  let restorePromise = null;

  return async () => {
    restorePromise ??= Promise.all([
      writeFile(paths.runtimeFlagsPath, originalRuntimeFlags, { encoding: 'utf-8' }),
      writeFile(paths.indexPath, originalIndex, { encoding: 'utf-8' }),
    ]).then(() => undefined);

    await restorePromise;
  };
}
