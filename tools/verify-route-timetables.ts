import { execFileSync } from 'node:child_process';
import { APP_CONFIG } from '../src/app/core/config';
import { ApiRouteTimetableResponse } from '../src/app/data/route-search/route-timetable.api-service';
import { mapRouteTimetableResponse } from '../src/app/data/route-search/route-timetable.mapper';

interface VerificationCase {
  readonly label: string;
  readonly consortiumId: number;
  readonly originNucleusId: string;
  readonly destinationNucleusId: string;
  readonly queryDate: string;
}

const CASES: readonly VerificationCase[] = [
  { label: 'La Gangosa → Almería', consortiumId: 6, originNucleusId: '74', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Adra → Almería', consortiumId: 6, originNucleusId: '52', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'El Ejido → Almería', consortiumId: 6, originNucleusId: '38', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Roquetas → Almería', consortiumId: 6, originNucleusId: '53', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Vícar → Almería', consortiumId: 6, originNucleusId: '77', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Benahadux → Almería', consortiumId: 6, originNucleusId: '33', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Níjar → Almería', consortiumId: 6, originNucleusId: '50', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Aguadulce → Almería', consortiumId: 6, originNucleusId: '41', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Berja → Almería', consortiumId: 6, originNucleusId: '31', destinationNucleusId: '10', queryDate: '2025-10-09' },
  { label: 'Adra → El Ejido', consortiumId: 6, originNucleusId: '52', destinationNucleusId: '38', queryDate: '2025-10-09' }
];

for (const testCase of CASES) {
  const url = `https://api.ctan.es/v1/Consorcios/${testCase.consortiumId}/horarios_origen_destino`;
  const params = new URLSearchParams({
    origen: testCase.originNucleusId,
    destino: testCase.destinationNucleusId,
    lang: 'ES'
  });
  const raw = execFileSync('curl', ['-s', `${url}?${params.toString()}`], { encoding: 'utf-8' });
  const response = JSON.parse(raw) as ApiRouteTimetableResponse;
  const entries = mapRouteTimetableResponse(response, new Date(`${testCase.queryDate}T00:00:00Z`), {
    timezone: APP_CONFIG.data.timezone
  });
  const formatted = entries
    .slice(0, 5)
    .map((entry) => `${formatTime(entry.departureTime)}→${formatTime(entry.arrivalTime)} ${entry.lineCode}`)
    .join(', ');
  process.stdout.write(`${testCase.label}: ${entries.length} servicios | ${formatted}\n`);
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
