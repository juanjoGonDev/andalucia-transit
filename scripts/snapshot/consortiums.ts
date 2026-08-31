export interface ConsortiumSummary {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly province: string;
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

interface ApiConsorcioDetail {
  readonly idConsorcio: string;
  readonly provincia?: string;
}

interface ConsortiumBaseSummary {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

export async function loadConsortiumSummaries(
  baseUrl: string,
  dependencies: ConsortiumDependencies
): Promise<readonly ConsortiumSummary[]> {
  const listUrl = `${baseUrl}/Consorcios/consorcios`;
  let entries: readonly ApiConsorcioEntry[];

  try {
    const response = await dependencies.fetchJson<ApiConsorciosResponse>(listUrl);
    entries = response.consorcios ?? [];
  } catch (error) {
    throw new Error(`Unable to fetch consortium list: ${formatError(error)}`);
  }

  const summaries = entries.map(mapConsortium).sort((first, second) => first.id - second.id);
  return Promise.all(
    summaries.map((summary) => loadConsortiumProvince(baseUrl, dependencies, summary))
  );
}

async function loadConsortiumProvince(
  baseUrl: string,
  dependencies: ConsortiumDependencies,
  summary: ConsortiumBaseSummary
): Promise<ConsortiumSummary> {
  const detailUrl = `${baseUrl}/Consorcios/${summary.id}/consorcio`;

  try {
    const detail = await dependencies.fetchJson<ApiConsorcioDetail>(detailUrl);
    const detailId = Number.parseInt(detail.idConsorcio, 10);
    if (detailId !== summary.id) {
      throw new Error(`Consortium ${summary.id} detail returned id ${detail.idConsorcio}`);
    }

    const province = normalizeRequiredText(detail.provincia);
    if (!province) {
      throw new Error(`Consortium ${summary.id} detail is missing provincia`);
    }

    return { ...summary, province } satisfies ConsortiumSummary;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`Consortium ${summary.id} detail`)) {
      throw error;
    }

    throw new Error(`Unable to fetch consortium ${summary.id} details: ${formatError(error)}`);
  }
}

function mapConsortium(entry: ApiConsorcioEntry): ConsortiumBaseSummary {
  const identifier = Number.parseInt(entry.idConsorcio, 10);

  if (Number.isNaN(identifier)) {
    throw new Error(`Invalid consortium identifier: ${entry.idConsorcio}`);
  }

  return {
    id: identifier,
    name: entry.nombre,
    shortName: entry.nombreCorto ?? entry.nombre
  } satisfies ConsortiumBaseSummary;
}

function normalizeRequiredText(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
