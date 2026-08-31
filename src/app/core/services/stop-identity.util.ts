const STOP_IDENTITY_SEPARATOR = ':' as const;

export function buildStopIdentity(consortiumId: number, stopId: string): string {
  return `${consortiumId}${STOP_IDENTITY_SEPARATOR}${stopId}`;
}
