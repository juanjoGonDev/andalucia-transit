import { createLinter, LintResult } from 'actionlint';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const START_MESSAGE = 'Validating GitHub Actions workflows.' as const;
const SUCCESS_MESSAGE = 'Workflow validation completed successfully.' as const;
const FAILURE_MESSAGE = 'Workflow validation failed.' as const;
const SKIP_MESSAGE = 'No workflow files found.' as const;
const ISSUE_FAILURE_MESSAGE = 'Workflow validation reported issues.' as const;
const WORKFLOWS_DIRECTORY = '.github/workflows' as const;
const UTF8 = 'utf-8' as const;
const YAML_EXTENSION = '.yml' as const;
const YAML_LONG_EXTENSION = '.yaml' as const;

void run();

async function run(): Promise<void> {
  try {
    console.info(START_MESSAGE);
    const workflowsPath = resolve(WORKFLOWS_DIRECTORY);

    if (!(await directoryExists(workflowsPath))) {
      console.info(SKIP_MESSAGE);
      return;
    }

    const files = await collectYamlFiles(workflowsPath);

    if (files.length === 0) {
      console.info(SKIP_MESSAGE);
      return;
    }

    const lint = await createLinter();
    const issues: LintResult[] = [];

    for (const file of files) {
      const content = await readFile(file, UTF8);
      const relativePath = relative(process.cwd(), file);
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
