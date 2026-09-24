import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Guards declarations that reference design tokens with `var(--…)` WITHOUT a fallback:
 * when the token does not exist the whole declaration drops at computed-value time
 * (e.g. `padding: var(--space-xs) var(--space-m)` silently losing all padding).
 *
 * Tokens are considered defined when a stylesheet sets them (`--name: …`) or a TS file
 * assigns them at runtime (`setProperty(…, '--name', …)` or `…_PROPERTY = '--name'`).
 * Usages with an explicit `var(--name, fallback)` are intentional optional hooks and are
 * allowed to stay unresolved.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = [path.join(REPO_ROOT, 'src/styles'), path.join(REPO_ROOT, 'src/app')];
const STYLE_EXTENSIONS = new Set(['.scss', '.css']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.scss', '.css']);

const TOKEN_DEFINITION = /--([a-zA-Z0-9-_]+)\s*:/g;
const TOKEN_PROPERTY_LITERAL = /['"]--([a-zA-Z0-9-_]+)['"]/g;
const TOKEN_USAGE = /var\(\s*--([a-zA-Z0-9-_]+)\s*([,)])/g;

async function collectFiles(directory: string, extensions: Set<string>): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, extensions)));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function matches(pattern: RegExp, content: string): string[] {
  const values: string[] = [];
  pattern.lastIndex = 0;
  let result: RegExpExecArray | null;

  while ((result = pattern.exec(content)) !== null) {
    values.push(result[1]);
  }

  return values;
}

interface TokenUsage {
  readonly name: string;
  readonly file: string;
}

async function collectTokenDefinitions(files: readonly string[]): Promise<Set<string>> {
  const defined = new Set<string>();

  for (const file of files) {
    const content = await readFile(file, 'utf8');

    for (const name of matches(TOKEN_DEFINITION, content)) {
      defined.add(name);
    }

    for (const name of matches(TOKEN_PROPERTY_LITERAL, content)) {
      defined.add(name);
    }
  }

  return defined;
}

function collectUnprotectedUsages(content: string, file: string): TokenUsage[] {
  const usages: TokenUsage[] = [];
  TOKEN_USAGE.lastIndex = 0;
  let result: RegExpExecArray | null;

  while ((result = TOKEN_USAGE.exec(content)) !== null) {
    if (result[2] === ',') {
      continue;
    }

    usages.push({ name: result[1], file });
  }

  return usages;
}

test('no stylesheet declaration depends on an undefined design token', async () => {
  const sourceFiles = (
    await Promise.all(SCAN_ROOTS.map((root) => collectFiles(root, SOURCE_EXTENSIONS)))
  ).flat();
  const styleFiles = (
    await Promise.all(SCAN_ROOTS.map((root) => collectFiles(root, STYLE_EXTENSIONS)))
  ).flat();
  assert.ok(styleFiles.length > 0, 'expected to find style files under src/');

  const defined = await collectTokenDefinitions(sourceFiles);

  const orphans = new Set<string>();

  for (const file of styleFiles) {
    const content = await readFile(file, 'utf8');

    for (const usage of collectUnprotectedUsages(content, path.relative(REPO_ROOT, file))) {
      if (!defined.has(usage.name)) {
        orphans.add(`--${usage.name} (used in ${usage.file})`);
      }
    }
  }

  assert.deepEqual(
    [...orphans].sort(),
    [],
    'Declarations depend on undefined design tokens:\n' + [...orphans].sort().join('\n')
  );
});
