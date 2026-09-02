import { createHash } from 'node:crypto';

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const MISSING_XML_DECLARATION_MESSAGE =
  'Canonical PWA icon must start with the expected UTF-8 XML declaration';

export function optimizePwaIconForDelivery(source: string): string {
  if (!source.startsWith(XML_DECLARATION)) {
    throw new Error(MISSING_XML_DECLARATION_MESSAGE);
  }

  const withoutDeclaration = source.slice(XML_DECLARATION.length);
  return withoutDeclaration.endsWith('\n')
    ? withoutDeclaration.slice(0, -1)
    : withoutDeclaration;
}

export function pwaIconSha256(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}
