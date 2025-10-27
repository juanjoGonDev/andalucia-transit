import { spawn } from 'node:child_process';
import { setDefaultResultOrder } from 'node:dns';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILEBIN_BASE_URL = 'https://filebin.net';
const JSON_MIME_TYPE = 'application/json';
const PNG_MIME_TYPE = 'image/png';
const PNG_EXTENSION = '.png';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DNS_RESULT_ORDER_IPV4_FIRST = 'ipv4first';
const CURL_BINARY = 'curl';
const CURL_SILENT = '--silent';
const CURL_SHOW_ERROR = '--show-error';
const CURL_FAIL = '--fail';
const CURL_UPLOAD = '--upload-file';
const CURL_HEADER = '--header';
const CURL_HEAD = '--head';
const HEADER_ACCEPT = `Accept: ${JSON_MIME_TYPE}`;
const HEADER_CONTENT_TYPE = `Content-Type: ${PNG_MIME_TYPE}`;
const CONTENT_TYPE_QUERY_KEY = 'content-type';
const URL_SEPARATOR = '/';
const LOG_PREFIX = '[upload-to-filebin]';
const BIN_LENGTH = 16;

setDefaultResultOrder(DNS_RESULT_ORDER_IPV4_FIRST);

interface UploadFileSummary {
  name: string;
  url: string;
}

export interface UploadSummary {
  bin: string;
  files: UploadFileSummary[];
}

interface UploadArgs {
  files: string[];
  bin?: string;
}

interface LocalFile {
  name: string;
  path: string;
  data: Buffer;
}

function logInfo(message: string): void {
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
}

function generateBinId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 2 + BIN_LENGTH);
  return (random + timestamp).slice(0, BIN_LENGTH);
}

function ensurePngSignature(data: Buffer): void {
  const signature = data.subarray(0, PNG_SIGNATURE.length);
  if (!signature.equals(PNG_SIGNATURE)) {
    throw new Error('Only PNG files can be uploaded to Filebin');
  }
}

async function readLocalFile(filePath: string): Promise<LocalFile> {
  const absolutePath = path.resolve(filePath);
  await fs.access(absolutePath);
  const fileName = path.basename(absolutePath);
  if (path.extname(fileName).toLowerCase() !== PNG_EXTENSION) {
    throw new Error('Only PNG files can be uploaded to Filebin');
  }
  const data = await fs.readFile(absolutePath);
  ensurePngSignature(data);
  return { name: fileName, path: absolutePath, data };
}

async function executeCurl(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CURL_BINARY, args);
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim().length > 0 ? stderr.trim() : 'curl upload failed'));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function ensurePngContent(endpoint: string): Promise<void> {
  logInfo(`Verifying content type at ${endpoint}`);
  const headArgs = [CURL_SILENT, CURL_SHOW_ERROR, CURL_FAIL, CURL_HEAD, endpoint];
  const output = await executeCurl(headArgs);
  try {
    const payload = JSON.parse(output) as { file?: { ['content-type']?: string } };
    const contentType = payload.file?.['content-type'];
    if (!contentType || contentType.toLowerCase() !== PNG_MIME_TYPE) {
      throw new Error(`Uploaded file is not stored as ${PNG_MIME_TYPE}`);
    }
    return;
  } catch {
    const normalized = output.toLowerCase();
    if (normalized.includes('"content-type"') && normalized.includes('image/png')) {
      return;
    }
    if (normalized.includes('response-content-type=image%2fpng') || normalized.includes('response-content-type=image/png')) {
      return;
    }
    if (!normalized.includes('content-type: image/png')) {
      throw new Error(`Uploaded file is not stored as ${PNG_MIME_TYPE}`);
    }
  }
}

async function uploadSingle(file: LocalFile, bin: string): Promise<{ url: string; bin: string }> {
  const baseEndpoint = `${FILEBIN_BASE_URL}/${encodeURIComponent(bin)}${URL_SEPARATOR}${encodeURIComponent(file.name)}`;
  const uploadEndpoint = `${baseEndpoint}?${CONTENT_TYPE_QUERY_KEY}=${encodeURIComponent(PNG_MIME_TYPE)}`;
  logInfo(`Uploading ${file.name} to ${baseEndpoint}`);
  const uploadArgs = [
    CURL_SILENT,
    CURL_SHOW_ERROR,
    CURL_FAIL,
    CURL_HEADER,
    HEADER_ACCEPT,
    CURL_HEADER,
    HEADER_CONTENT_TYPE,
    CURL_UPLOAD,
    file.path,
    uploadEndpoint,
  ];
  const output = await executeCurl(uploadArgs);
  let payload: { bin?: { id?: string }; file?: { ['content-type']?: string } };
  try {
    payload = JSON.parse(output) as { bin?: { id?: string }; file?: { ['content-type']?: string } };
  } catch (error) {
    throw new Error(`Filebin returned an invalid response: ${(error as Error).message}`);
  }
  const resolvedBin = payload.bin?.id ?? bin;
  const storedType = payload.file?.['content-type'];
  if (!storedType || storedType.toLowerCase() !== PNG_MIME_TYPE) {
    throw new Error('Filebin stored file without PNG metadata');
  }
  const publicUrl = `${FILEBIN_BASE_URL}/${encodeURIComponent(resolvedBin)}${URL_SEPARATOR}${encodeURIComponent(file.name)}`;
  await ensurePngContent(publicUrl);
  logInfo(`Uploaded ${file.name} to ${publicUrl}`);
  return { url: publicUrl, bin: resolvedBin };
}

export async function uploadToFilebin(filePaths: string[], existingBin?: string): Promise<UploadSummary> {
  if (filePaths.length === 0) {
    throw new Error('At least one file is required for upload');
  }
  let bin = existingBin ?? generateBinId();
  const summaries: UploadFileSummary[] = [];
  for (const filePath of filePaths) {
    const file = await readLocalFile(filePath);
    const result = await uploadSingle(file, bin);
    bin = result.bin;
    summaries.push({ name: file.name, url: result.url });
  }
  return { bin, files: summaries };
}

function parseArgs(argv: string[]): UploadArgs {
  const files: string[] = [];
  let bin: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--bin') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing value for --bin');
      }
      bin = next;
      index += 1;
      continue;
    }
    files.push(value);
  }
  if (files.length === 0) {
    throw new Error('No files provided for upload');
  }
  return { files, bin };
}

async function runCli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const summary = await uploadToFilebin(args.files, args.bin);
  process.stdout.write(`${JSON.stringify(summary, undefined, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
