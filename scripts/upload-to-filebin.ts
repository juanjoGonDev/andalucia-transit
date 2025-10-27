import { setDefaultResultOrder } from 'dns';
import { promises as fs } from 'fs';
import http, { IncomingHttpHeaders } from 'http';
import https from 'https';
import path from 'path';

const FILEBIN_BASE_URL = 'https://filebin.net';
const JSON_ACCEPT_HEADER = 'application/json';
const PNG_MIME_TYPE = 'image/png';
const DNS_RESULT_ORDER_IPV4_FIRST = 'ipv4first';
const HTTP_PROTOCOL_HTTPS = 'https:';
const HTTP_METHOD_POST = 'POST';
const HEADER_ACCEPT = 'Accept';
const HEADER_CONTENT_TYPE = 'Content-Type';
const HEADER_CONTENT_LENGTH = 'Content-Length';
const HEADER_LOCATION = 'location';
const MULTIPART_BOUNDARY_PREFIX = '----FilebinBoundary';
const CRLF = '\r\n';

setDefaultResultOrder(DNS_RESULT_ORDER_IPV4_FIRST);

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

interface LocalFile {
  name: string;
  data: Buffer;
}

interface FilebinResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

export type MultipartRequester = (
  endpoint: string,
  body: Buffer,
  boundary: string,
) => Promise<FilebinResponse>;

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

function generateBoundary(): string {
  return `${MULTIPART_BOUNDARY_PREFIX}${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function buildMultipartBody(fileName: string, data: Buffer, boundary: string): Buffer {
  const headerLines = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    `Content-Type: ${PNG_MIME_TYPE}`,
    '',
    '',
  ];
  const header = Buffer.from(headerLines.join(CRLF), 'utf-8');
  const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf-8');
  return Buffer.concat([header, data, footer]);
}

function sendMultipartRequest(endpoint: string, body: Buffer, boundary: string): Promise<FilebinResponse> {
  const url = new URL(endpoint);
  const headers = {
    [HEADER_ACCEPT]: JSON_ACCEPT_HEADER,
    [HEADER_CONTENT_TYPE]: `multipart/form-data; boundary=${boundary}`,
    [HEADER_CONTENT_LENGTH]: body.length.toString(),
  };
  const options = {
    method: HTTP_METHOD_POST,
    hostname: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    path: `${url.pathname}${url.search}`,
    headers,
  };
  const client = url.protocol === HTTP_PROTOCOL_HTTPS ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.request(options, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => {
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(bufferChunk);
      });
      response.on('end', () => {
        const payload = Buffer.concat(chunks).toString('utf-8');
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: payload,
        });
      });
    });
    request.on('error', (error) => {
      reject(error);
    });
    request.write(body);
    request.end();
  });
}

async function readFileBuffer(filePath: string): Promise<LocalFile> {
  const absolutePath = path.resolve(filePath);
  const data = await fs.readFile(absolutePath);
  const fileName = path.basename(absolutePath);
  return { name: fileName, data };
}

const defaultRequester: MultipartRequester = sendMultipartRequest;

export async function uploadToFilebin(
  filePaths: string[],
  existingBin?: string,
  requestFn: MultipartRequester = defaultRequester,
): Promise<UploadSummary> {
  if (filePaths.length === 0) {
    throw new Error('At least one file is required for upload');
  }
  let binIdentifier = existingBin;
  const summaries: UploadFileSummary[] = [];
  for (const filePath of filePaths) {
    const file = await readFileBuffer(filePath);
    const boundary = generateBoundary();
    const body = buildMultipartBody(file.name, file.data, boundary);
    const endpoint = binIdentifier ? `${FILEBIN_BASE_URL}/${binIdentifier}` : FILEBIN_BASE_URL;
    const response = await requestFn(endpoint, body, boundary);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Filebin upload failed for ${file.name} with status ${response.status}`);
    }
    let payload: FilebinPayload;
    try {
      payload = ensurePayload(JSON.parse(response.body));
    } catch (error) {
      throw new Error(`Unable to parse Filebin response for ${file.name}: ${(error as Error).message}`);
    }
    if (!binIdentifier) {
      const locationHeader = ensureString(response.headers[HEADER_LOCATION]);
      binIdentifier = payload.bin ?? payload.key ?? (locationHeader ? extractBinFromLocation(locationHeader) : undefined);
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
