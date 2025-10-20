import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfig } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';

export interface ApiRouteTimetableResponse {
  readonly bloques: readonly ApiRouteTimetableBlock[];
  readonly horario: readonly ApiRouteTimetableEntry[];
  readonly frecuencias: readonly ApiRouteFrequency[];
}

interface ApiRouteTimetableBlock {
  readonly nombre: string;
  readonly color: string;
}

interface ApiRouteTimetableEntry {
  readonly idlinea: string;
  readonly codigo: string;
  readonly horas: readonly string[];
  readonly dias: string;
  readonly observaciones: string;
  readonly demandahoras?: string;
}

interface ApiRouteFrequency {
  readonly idfrecuencia: string;
  readonly acronimo: string;
  readonly nombre: string;
}

@Injectable({ providedIn: 'root' })
export class RouteTimetableApiService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  loadTimetable(
    consortiumId: number,
    originNucleusId: string,
    destinationNucleusId: string
  ): Observable<ApiRouteTimetableResponse> {
    const url = `${this.config.apiBaseUrl}/v1/Consorcios/${consortiumId}/horarios_origen_destino`;
    const params = {
      origen: originNucleusId,
      destino: destinationNucleusId,
      lang: DEFAULT_LANGUAGE
    };
    return this.http.get<ApiRouteTimetableResponse>(url, { params });
  }
}

const DEFAULT_LANGUAGE = 'ES' as const;
