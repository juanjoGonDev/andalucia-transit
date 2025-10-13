import { spawn } from 'node:child_process';

interface SetupCommand {
  readonly title: string;
  readonly command: string;
  readonly args: readonly string[];
}

const START_MESSAGE = 'Starting development environment setup.' as const;
const COMPLETE_MESSAGE = 'Development environment setup completed successfully.' as const;
const FAILURE_MESSAGE = 'Development environment setup failed.' as const;
const STEP_PREFIX = 'Step' as const;
const PROGRESS_DELIMITER = ' | ' as const;
const COMMANDS: readonly SetupCommand[] = [
  { title: 'Install dependencies', command: 'npm', args: ['ci'] },
  { title: 'Validate formatting', command: 'npm', args: ['run', 'format:check'] },
  { title: 'Run lint checks', command: 'npm', args: ['run', 'lint'] },
  { title: 'Execute script tests', command: 'npm', args: ['run', 'test:scripts'] },
  { title: 'Compile Angular workspace', command: 'npm', args: ['run', 'build'] },
  { title: 'Generate transport snapshot', command: 'npm', args: ['run', 'snapshot'] }
] as const;

void run();

async function run(): Promise<void> {
  try {
    console.info(START_MESSAGE);
    for (const [index, command] of COMMANDS.entries()) {
      console.info(buildProgressMessage(command.title, index + 1, COMMANDS.length));
      await execute(command);
    }
    console.info(COMPLETE_MESSAGE);
  } catch (error) {
    console.error(FAILURE_MESSAGE, formatError(error));
    process.exitCode = 1;
  }
}

function buildProgressMessage(title: string, step: number, total: number): string {
  const percentage = Math.round((step / total) * 100);
  return `${percentage}%${PROGRESS_DELIMITER}${STEP_PREFIX} ${step}/${total}${PROGRESS_DELIMITER}${title}`;
}

function execute(command: SetupCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, [...command.args], {
      stdio: 'inherit',
      env: process.env,
      shell: false
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command ${command.command} ${command.args.join(' ')} exited with code ${code ?? 0}`));
    });

    child.on('error', reject);
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
