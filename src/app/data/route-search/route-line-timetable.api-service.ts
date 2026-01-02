import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

export interface ApiRouteLineTimetableResponse {
  readonly frecuencias: readonly ApiRouteLineFrequency[];
  readonly planificadores: readonly ApiRouteLinePlanner[];
  readonly horaCorte?: string;
  readonly observacionesModoTransporte?: string;
}

export interface ApiRouteLineFrequency {
  readonly idfrecuencia: string;
  readonly acronimo: string;
  readonly nombre: string;
}

export interface ApiRouteLinePlanner {
  readonly idPlani?: string | number;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly muestraFechaFin?: string | number | boolean;
  readonly bloquesIda: readonly ApiRouteLineBlock[];
  readonly bloquesVuelta: readonly ApiRouteLineBlock[];
  readonly horarioIda: readonly ApiRouteLineScheduleEntry[];
  readonly horarioVuelta: readonly ApiRouteLineScheduleEntry[];
}

export interface ApiRouteLineBlock {
  readonly nombre: string;
  readonly color: string;
  readonly tipo?: number | string;
}

export interface ApiRouteLineScheduleEntry {
  readonly horas: readonly string[];
  readonly frecuencia?: string;
  readonly dias?: string;
  readonly observaciones: string;
  readonly demandahoras?: string;
}

@Injectable({ providedIn: 'root' })
export class RouteLineTimetableApiService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  loadLineTimetable(
    consortiumId: number,
    lineId: string,
    queryDate: Date
  ): Observable<ApiRouteLineTimetableResponse> {
    const url = `${this.config.apiBaseUrl}/v1/Consorcios/${consortiumId}/horarios_lineas`;
    const date = DateTime.fromJSDate(queryDate, { zone: this.config.data.timezone });
    const params = {
      linea: lineId,
      dia: `${date.day}`,
      mes: `${date.month}`,
      frecuencia: '',
      lang: DEFAULT_LANGUAGE
    };
    return this.http.get<ApiRouteLineTimetableResponse>(url, { params });
  }
}

const DEFAULT_LANGUAGE = 'ES' as const;
