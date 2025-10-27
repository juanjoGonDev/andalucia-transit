import { File } from 'buffer';
import { promises as fs } from 'fs';
import path from 'path';

const FILEBIN_BASE_URL = 'https://filebin.net';
const JSON_ACCEPT_HEADER = 'application/json';
const PNG_MIME_TYPE = 'image/png';

interface FilebinFileDescriptor {
  filename?: string;
  name?: string;
  url?: string;
}

interface FilebinPayload {
  bin?: string;
  key?: string;
  url?: string;
  files?: FilebinFileDescriptor[];
}

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

type FetchImplementation = typeof fetch;

function ensureString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

function ensurePayload(value: unknown): FilebinPayload {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Filebin response payload is not an object');
  }
  const record = value as Record<string, unknown>;
  const payload: FilebinPayload = {};
  payload.bin = ensureString(record.bin);
  payload.key = ensureString(record.key);
  payload.url = ensureString(record.url);
  if (Array.isArray(record.files)) {
    payload.files = record.files.map((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return {};
      }
      const item = entry as Record<string, unknown>;
      const descriptor: FilebinFileDescriptor = {};
      descriptor.filename = ensureString(item.filename);
      descriptor.name = ensureString(item.name);
      descriptor.url = ensureString(item.url);
      return descriptor;
    });
  }
  return payload;
}

function extractBinFromLocation(locationHeader: string): string | undefined {
  try {
    const url = locationHeader.startsWith('http') ? new URL(locationHeader) : new URL(locationHeader, FILEBIN_BASE_URL);
    const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
    if (segments.length > 0) {
      return segments[0];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveFileUrl(payload: FilebinPayload, binId: string, fileName: string): string {
  if (payload.files) {
    const match = payload.files.find((entry) => entry.url && (entry.filename === fileName || entry.name === fileName));
    if (match && match.url) {
      return match.url;
    }
  }
  if (payload.url) {
    return payload.url;
  }
  return `${FILEBIN_BASE_URL}/${binId}/${fileName}`;
}

async function readFileBuffer(filePath: string): Promise<File> {
  const absolutePath = path.resolve(filePath);
  const data = await fs.readFile(absolutePath);
  const fileName = path.basename(absolutePath);
  return new File([data], fileName, { type: PNG_MIME_TYPE });
}

export async function uploadToFilebin(filePaths: string[], existingBin?: string, requestFn: FetchImplementation = fetch): Promise<UploadSummary> {
  if (filePaths.length === 0) {
    throw new Error('At least one file is required for upload');
  }
  let binIdentifier = existingBin;
  const summaries: UploadFileSummary[] = [];
  for (const filePath of filePaths) {
    const file = await readFileBuffer(filePath);
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = binIdentifier ? `${FILEBIN_BASE_URL}/${binIdentifier}` : FILEBIN_BASE_URL;
    const response = await requestFn(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: JSON_ACCEPT_HEADER,
      },
    });
    if (!response.ok) {
      throw new Error(`Filebin upload failed for ${file.name} with status ${response.status}`);
    }
    const text = await response.text();
    let payload: FilebinPayload;
    try {
      payload = ensurePayload(JSON.parse(text));
    } catch (error) {
      throw new Error(`Unable to parse Filebin response for ${file.name}: ${(error as Error).message}`);
    }
    if (!binIdentifier) {
      binIdentifier = payload.bin ?? payload.key ?? extractBinFromLocation(response.headers.get('location') ?? '');
    }
    if (!binIdentifier) {
      throw new Error(`Filebin did not return a bin identifier for ${file.name}`);
    }
    const fileUrl = resolveFileUrl(payload, binIdentifier, file.name);
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
