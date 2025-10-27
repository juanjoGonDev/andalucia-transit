import { spawn } from 'child_process';
import { setDefaultResultOrder } from 'dns';
import { promises as fs } from 'fs';
import path from 'path';

const FILEBIN_BASE_URL = 'https://filebin.net';
const JSON_ACCEPT_HEADER = 'application/json';
const PNG_MIME_TYPE = 'image/png';
const PNG_EXTENSION = '.png';
const DNS_RESULT_ORDER_IPV4_FIRST = 'ipv4first';
const CURL_BINARY = 'curl';
const CURL_SILENT = '--silent';
const CURL_SHOW_ERROR = '--show-error';
const CURL_FAIL = '--fail';
const CURL_UPLOAD = '--upload-file';
const CURL_HEADER = '--header';
const CURL_HEAD = '--head';
const HEADER_CONTENT_TYPE = `Content-Type: ${PNG_MIME_TYPE}`;
const HEADER_ACCEPT = `Accept: ${JSON_ACCEPT_HEADER}`;
const HEADER_RESPONSE_CONTENT_TYPE = 'response-content-type=image%2Fpng';
const URL_SEPARATOR = '/';
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
}

function generateBinId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 2 + BIN_LENGTH);
  return (random + timestamp).slice(0, BIN_LENGTH);
}

async function readFileBuffer(filePath: string): Promise<LocalFile> {
  const absolutePath = path.resolve(filePath);
  await fs.access(absolutePath);
  const fileName = path.basename(absolutePath);
  if (path.extname(fileName).toLowerCase() !== PNG_EXTENSION) {
    throw new Error('Only PNG files can be uploaded to Filebin');
  }
  return { name: fileName, path: absolutePath };
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

export async function uploadToFilebin(filePaths: string[], existingBin?: string): Promise<UploadSummary> {
  if (filePaths.length === 0) {
    throw new Error('At least one file is required for upload');
  }
  const binIdentifier = existingBin ?? generateBinId();
  const summaries: UploadFileSummary[] = [];
  for (const filePath of filePaths) {
    const file = await readFileBuffer(filePath);
    const endpoint = `${FILEBIN_BASE_URL}/${encodeURIComponent(binIdentifier)}${URL_SEPARATOR}${encodeURIComponent(file.name)}`;
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
      endpoint,
    ];
    await executeCurl(uploadArgs);
    const headArgs = [CURL_SILENT, CURL_SHOW_ERROR, CURL_FAIL, CURL_HEAD, endpoint];
    const headers = await executeCurl(headArgs);
    const normalizedHeaders = headers.toLowerCase();
    const hasImageHeader =
      normalizedHeaders.includes('content-type: image/png') || headers.includes(HEADER_RESPONSE_CONTENT_TYPE);
    if (!hasImageHeader) {
      throw new Error(`Uploaded file ${file.name} is not stored as image/png`);
    }
    const fileUrl = `${FILEBIN_BASE_URL}/${binIdentifier}/${file.name}`;
    summaries.push({
      name: file.name,
      url: fileUrl,
    });
  }
  return {
    bin: binIdentifier,
    files: summaries,
  };
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
    } else {
      files.push(value);
    }
  }
  if (files.length === 0) {
    throw new Error('No files provided for upload');
  }
  return { files, bin };
}

async function runCli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const summary = await uploadToFilebin(args.files, args.bin);
  console.log(JSON.stringify(summary, undefined, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
