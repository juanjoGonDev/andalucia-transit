import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Guards the recent-search preview line badge: every displayable line code
 * across every consortium catalog must fit on ONE line inside the badge.
 * The guard reads the real catalog datasets (the largest legitimate names)
 * and the component stylesheet, so regressions are caught by `test:scripts`.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_DIR = path.join(REPO_ROOT, 'src/assets/data/catalog');
const ENTRY_SCSS = path.join(
  REPO_ROOT,
  'src/app/features/home/recent-searches/ui/recent-search-preview-entry/recent-search-preview-entry.component.scss'
);

/** User-facing short code = leading token of the catalog line name (e.g. "M-101A"). */
const MAX_BADGE_CHARS_ALLOWED = 6;
const LINE_NAME_TOKEN = /^[A-Z]{1,2}-\S+/;

interface CatalogLinesFile {
  readonly lines: ReadonlyArray<{ readonly name: string }>;
}

async function collectBadgeCandidates(): Promise<readonly string[]> {
  const consortia = (await readdir(CATALOG_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('consortium-'))
    .map((entry) => entry.name);

  const candidates: string[] = [];
  for (const consortium of consortia) {
    const raw = await readFile(path.join(CATALOG_DIR, consortium, 'lines.json'), 'utf8');
    const parsed = JSON.parse(raw) as CatalogLinesFile;
    for (const line of parsed.lines) {
      const token = line.name.trim().split(/\s+/)[0];
      if (token && LINE_NAME_TOKEN.test(token)) {
        candidates.push(token);
      }
    }
  }
  return candidates;
}

function lineRule(scss: string): string {
  const start = scss.indexOf('.recent-preview-entry__line');
  assert.notEqual(start, -1, 'missing .recent-preview-entry__line rule');
  return scss.slice(start, scss.indexOf('}', start) + 1);
}

test('every catalog line code fits the badge character budget', async () => {
  const candidates = await collectBadgeCandidates();
  assert.ok(candidates.length > 0, 'expected at least one line catalog entry');
  const longest = candidates.reduce((a, b) => (b.length > a.length ? b : a));
  assert.ok(
    longest.length <= MAX_BADGE_CHARS_ALLOWED,
    `badge budget exceeded: "${longest}" has ${longest.length} chars (max ${MAX_BADGE_CHARS_ALLOWED})`
  );
});

test('recent preview badge never wraps line codes', async () => {
  const scss = await readFile(ENTRY_SCSS, 'utf8');
  const rule = lineRule(scss);
  assert.ok(
    /white-space:\s*nowrap/.test(rule),
    'line badge must declare white-space: nowrap so codes can never split'
  );
  const minInline = rule.match(/min-inline-size:\s*([0-9.]+)rem/);
  assert.ok(minInline, 'line badge must declare a min-inline-size');
  assert.ok(
    parseFloat(minInline![1]) >= 4,
    `line badge min-inline-size ${minInline![1]}rem is too small for 6-char codes`
  );
});
