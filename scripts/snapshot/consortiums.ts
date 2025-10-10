export interface ConsortiumSummary {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

export interface ConsortiumDependencies {
  readonly fetchJson: <T>(url: string) => Promise<T>;
}

interface ApiConsorcioEntry {
  readonly idConsorcio: string;
  readonly nombre: string;
  readonly nombreCorto?: string;
}

interface ApiConsorciosResponse {
  readonly consorcios: readonly ApiConsorcioEntry[];
}

export async function loadConsortiumSummaries(
  baseUrl: string,
  dependencies: ConsortiumDependencies
): Promise<readonly ConsortiumSummary[]> {
  const url = `${baseUrl}/Consorcios/consorcios`;

  try {
    const response = await dependencies.fetchJson<ApiConsorciosResponse>(url);
    const entries = response.consorcios ?? [];

    return entries
      .map((entry) => mapConsortium(entry))
      .sort((first, second) => first.id - second.id);
  } catch (error) {
    throw new Error(`Unable to fetch consortium list: ${formatError(error)}`);
  }
}

function mapConsortium(entry: ApiConsorcioEntry): ConsortiumSummary {
  const identifier = Number.parseInt(entry.idConsorcio, 10);

  if (Number.isNaN(identifier)) {
    throw new Error(`Invalid consortium identifier: ${entry.idConsorcio}`);
  }

  return {
    id: identifier,
    name: entry.nombre,
    shortName: entry.nombreCorto ?? entry.nombre
  } satisfies ConsortiumSummary;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
