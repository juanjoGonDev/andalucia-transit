import { createLinter, LintResult } from 'actionlint';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const START_MESSAGE = 'Validating GitHub Actions workflows.' as const;
const DISCOVERY_MESSAGE_SINGULAR = 'Found 1 workflow file to validate.' as const;
const DISCOVERY_MESSAGE_PLURAL_PREFIX = 'Found' as const;
const DISCOVERY_MESSAGE_PLURAL_SUFFIX = 'workflow files to validate.' as const;
const PROGRESS_MESSAGE_PREFIX = 'Validating workflow file' as const;
const PROGRESS_MESSAGE_SEPARATOR = '/' as const;
const PROGRESS_MESSAGE_INFIX = ':' as const;
const SUCCESS_MESSAGE = 'Workflow validation completed successfully.' as const;
const SUMMARY_MESSAGE_PREFIX = 'Validated' as const;
const SUMMARY_MESSAGE_SUFFIX = 'workflow files without issues.' as const;
const FAILURE_MESSAGE = 'Workflow validation failed.' as const;
const SKIP_MESSAGE = 'No workflow files found.' as const;
const ISSUE_FAILURE_MESSAGE = 'Workflow validation reported issues.' as const;
const WORKFLOWS_DIRECTORY = '.github/workflows' as const;
const UTF8 = 'utf-8' as const;
const YAML_EXTENSION = '.yml' as const;
const YAML_LONG_EXTENSION = '.yaml' as const;
const DISPLAY_INDEX_OFFSET = 1 as const;

void run();

async function run(): Promise<void> {
  try {
    console.info(START_MESSAGE);
    const workflowsPath = resolve(WORKFLOWS_DIRECTORY);

    if (!(await directoryExists(workflowsPath))) {
      console.info(SKIP_MESSAGE);
      return;
    }

    const files = (await collectYamlFiles(workflowsPath)).sort();

    if (files.length === 0) {
      console.info(SKIP_MESSAGE);
      return;
    }

    console.info(createDiscoveryMessage(files.length));
    const lint = await createLinter();
    const issues: LintResult[] = [];
    const totalFiles = files.length;

    for (const [index, file] of files.entries()) {
      const content = await readFile(file, UTF8);
      const relativePath = relative(process.cwd(), file);
      logProgress(relativePath, index, totalFiles);
      const results = lint(content, relativePath);

      if (results.length > 0) {
        issues.push(...results);
      }
    }

    if (issues.length > 0) {
      for (const issue of issues) {
        console.error(formatIssue(issue));
      }
      throw new Error(ISSUE_FAILURE_MESSAGE);
    }

    console.info(createSummaryMessage(totalFiles));
    console.info(SUCCESS_MESSAGE);
  } catch (error) {
    if (!(error instanceof Error && error.message === ISSUE_FAILURE_MESSAGE)) {
      console.error(FAILURE_MESSAGE, formatError(error));
    }
    process.exitCode = 1;
  }
}

async function collectYamlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectYamlFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && isYamlFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function isYamlFile(filename: string): boolean {
  return filename.endsWith(YAML_EXTENSION) || filename.endsWith(YAML_LONG_EXTENSION);
}

function formatIssue(issue: LintResult): string {
  return `${issue.file}:${issue.line}:${issue.column} ${issue.kind} ${issue.message}`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function createDiscoveryMessage(count: number): string {
  if (count === 1) {
    return DISCOVERY_MESSAGE_SINGULAR;
  }

  return `${DISCOVERY_MESSAGE_PLURAL_PREFIX} ${count} ${DISCOVERY_MESSAGE_PLURAL_SUFFIX}`;
}

function logProgress(file: string, index: number, total: number): void {
  const current = index + DISPLAY_INDEX_OFFSET;
  console.info(`${PROGRESS_MESSAGE_PREFIX} ${current}${PROGRESS_MESSAGE_SEPARATOR}${total}${PROGRESS_MESSAGE_INFIX} ${file}`);
}

function createSummaryMessage(total: number): string {
  return `${SUMMARY_MESSAGE_PREFIX} ${total} ${SUMMARY_MESSAGE_SUFFIX}`;
}
