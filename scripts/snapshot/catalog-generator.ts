import { StopDirectoryConsortiumConfig } from './stop-directory';

export interface CatalogConfig {
  readonly baseUrl: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly consortiums: readonly StopDirectoryConsortiumConfig[];
}

export interface CatalogDependencies {
  readonly fetchJson: <T>(url: string) => Promise<T>;
  readonly now?: () => Date;
}

export interface CatalogMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly consortiums: readonly StopDirectoryConsortiumConfig[];
}

export interface CatalogBuildResult {
  readonly metadata: CatalogMetadata;
  readonly consortia: readonly ConsortiumDataset[];
}

export interface ConsortiumDataset {
  readonly summary: StopDirectoryConsortiumConfig;
  readonly municipalities: readonly MunicipalityEntry[];
  readonly nuclei: readonly NucleusEntry[];
  readonly lines: readonly LineEntry[];
}

export interface MunicipalityEntry {
  readonly id: string;
  readonly name: string;
}

export interface NucleusEntry {
  readonly id: string;
  readonly municipalityId: string;
  readonly zone: string | null;
  readonly name: string;
}

export interface LineEntry {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
  readonly modeId: string | null;
  readonly operators: readonly string[];
  readonly hasNews: boolean;
  readonly concession: string | null;
  readonly notes: string | null;
  readonly modeNotes: string | null;
  readonly accessibility: string | null;
  readonly thickness: number | null;
  readonly color: string | null;
  readonly outboundThermometerUrl: string | null;
  readonly inboundThermometerUrl: string | null;
  readonly hasOutbound: boolean;
  readonly hasInbound: boolean;
  readonly path: readonly string[];
  readonly outboundPath: readonly string[];
  readonly inboundPath: readonly string[];
}

interface ApiMunicipioEntry {
  readonly idMunicipio: string;
  readonly datos: string;
}

interface ApiMunicipiosResponse {
  readonly municipios: readonly ApiMunicipioEntry[];
}

interface ApiNucleoEntry {
  readonly idNucleo: string;
  readonly idMunicipio: string;
  readonly idZona?: string;
  readonly nombre: string;
}

interface ApiNucleosResponse {
  readonly nucleos: readonly ApiNucleoEntry[];
}

interface ApiLineSummaryEntry {
  readonly idLinea: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly hayNoticia?: string;
  readonly modo: string;
  readonly idModo?: string;
  readonly operadores?: string;
}

interface ApiLineSummariesResponse {
  readonly lineas: readonly ApiLineSummaryEntry[];
}

interface ApiLineDetail {
  readonly idLinea: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly modo: string;
  readonly observaciones?: string;
  readonly observacionesModoTransporte?: string;
  readonly operadores?: string;
  readonly pmr?: string;
  readonly hayNoticias?: number | string;
  readonly concesion?: string;
  readonly grosor?: string;
  readonly color?: string;
  readonly termometroIda?: string;
  readonly termometroVuelta?: string;
  readonly tieneIda?: number | string;
  readonly tieneVuelta?: number | string;
  readonly polilinea?: readonly string[];
  readonly polilineaIda?: readonly string[];
  readonly polilineaVuelta?: readonly string[];
  readonly idModo?: string;
}

export async function buildCatalog(
  config: CatalogConfig,
  dependencies: CatalogDependencies
): Promise<CatalogBuildResult> {
  const generationInstant = dependencies.now?.() ?? new Date();
  const consortia: ConsortiumDataset[] = [];

  for (const consortium of config.consortiums) {
    const [municipalities, nuclei, lines] = await Promise.all([
      loadMunicipalities(config, dependencies, consortium.id),
      loadNuclei(config, dependencies, consortium.id),
      loadLines(config, dependencies, consortium.id)
    ]);

    consortia.push({
      summary: consortium,
      municipalities,
      nuclei,
      lines
    });
  }

  return {
    metadata: {
      generatedAt: generationInstant.toISOString(),
      timezone: config.timezone,
      providerName: config.providerName,
      consortiums: config.consortiums
    },
    consortia: Object.freeze(consortia)
  } satisfies CatalogBuildResult;
}

async function loadMunicipalities(
  config: CatalogConfig,
  dependencies: CatalogDependencies,
  consortiumId: number
): Promise<readonly MunicipalityEntry[]> {
  const url = `${config.baseUrl}/Consorcios/${consortiumId}/municipios`;

  try {
    const response = await dependencies.fetchJson<ApiMunicipiosResponse>(url);
    const entries = response.municipios ?? [];

    return entries
      .map((entry) => ({ id: entry.idMunicipio, name: entry.datos }))
      .sort((first, second) => first.name.localeCompare(second.name, 'es-ES'));
  } catch (error) {
    throw new Error(`Unable to fetch municipalities for consortium ${consortiumId}: ${formatError(error)}`);
  }
}

async function loadNuclei(
  config: CatalogConfig,
  dependencies: CatalogDependencies,
  consortiumId: number
): Promise<readonly NucleusEntry[]> {
  const url = `${config.baseUrl}/Consorcios/${consortiumId}/nucleos`;

  try {
    const response = await dependencies.fetchJson<ApiNucleosResponse>(url);
    const entries = response.nucleos ?? [];

    return entries
      .map((entry) => ({
        id: entry.idNucleo,
        municipalityId: entry.idMunicipio,
        zone: entry.idZona ?? null,
        name: entry.nombre
      }))
      .sort((first, second) => first.name.localeCompare(second.name, 'es-ES'));
  } catch (error) {
    throw new Error(`Unable to fetch nuclei for consortium ${consortiumId}: ${formatError(error)}`);
  }
}

async function loadLines(
  config: CatalogConfig,
  dependencies: CatalogDependencies,
  consortiumId: number
): Promise<readonly LineEntry[]> {
  const summaryUrl = `${config.baseUrl}/Consorcios/${consortiumId}/lineas`;

  try {
    const summaries = await dependencies.fetchJson<ApiLineSummariesResponse>(summaryUrl);
    const entries = summaries.lineas ?? [];
    const details: LineEntry[] = [];

    for (const summary of entries) {
      details.push(mergeLineSummary(summary, null));
    }

    return details.sort((first, second) => first.name.localeCompare(second.name, 'es-ES'));
  } catch (error) {
    throw new Error(`Unable to fetch lines for consortium ${consortiumId}: ${formatError(error)}`);
  }
}

function mergeLineSummary(summary: ApiLineSummaryEntry, detail: ApiLineDetail | null): LineEntry {
  const operators = (detail?.operadores ?? summary.operadores ?? '').trim();

  return {
    id: summary.idLinea,
    code: summary.codigo,
    name: summary.nombre,
    mode: detail?.modo ?? summary.modo,
    modeId: detail?.idModo ?? summary.idModo ?? null,
    operators: operators
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    hasNews: parseBoolean(detail?.hayNoticias ?? summary.hayNoticia ?? '0'),
    concession: detail?.concesion ?? null,
    notes: detail?.observaciones ?? null,
    modeNotes: detail?.observacionesModoTransporte ?? null,
    accessibility: detail?.pmr ?? null,
    thickness: parseNullableNumber(detail?.grosor),
    color: detail?.color ?? null,
    outboundThermometerUrl: detail?.termometroIda ?? null,
    inboundThermometerUrl: detail?.termometroVuelta ?? null,
    hasOutbound: parseBoolean(detail?.tieneIda ?? 0),
    hasInbound: parseBoolean(detail?.tieneVuelta ?? 0),
    path: freezePath(detail?.polilinea ?? []),
    outboundPath: freezePath(detail?.polilineaIda ?? []),
    inboundPath: freezePath(detail?.polilineaVuelta ?? [])
  } satisfies LineEntry;
}

function parseBoolean(value: string | number): boolean {
  if (typeof value === 'number') {
    return value !== 0;
  }

  return value !== '0';
}

function parseNullableNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function freezePath(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
