import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';

export interface ApiStopInformation {
  readonly idParada: string;
  readonly nombre: string;
  readonly latitud: string;
  readonly longitud: string;
  readonly municipio: string;
  readonly nucleo: string;
}

export interface ApiStopServicesResponse {
  readonly servicios: readonly ApiStopServiceEntry[];
  readonly horaIni: string;
  readonly horaFin: string;
}

export interface ApiStopServiceEntry {
  readonly idParada: string;
  readonly idLinea: string;
  readonly servicio: string;
  readonly nombre: string;
  readonly linea: string;
  readonly sentido: string;
  readonly destino: string;
  readonly tipo: string;
}

@Injectable({ providedIn: 'root' })
export class StopScheduleApiService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  loadStopInformation(consortiumId: number, stopId: string): Observable<ApiStopInformation> {
    const url = `${this.config.apiBaseUrl}/v1/Consorcios/${consortiumId}/paradas/${stopId}`;
    return this.http.get<ApiStopInformation>(url);
  }

  loadStopServices(
    consortiumId: number,
    stopId: string,
    queryTime: Date
  ): Observable<ApiStopServicesResponse> {
    const formatted = DateTime.fromJSDate(queryTime, { zone: this.config.data.timezone }).toFormat(
      'dd-LL-yyyy+HH:mm'
    );
    const url = `${this.config.apiBaseUrl}/v1/Consorcios/${consortiumId}/paradas/${stopId}/servicios?horaIni=${formatted}`;
    return this.http.get<ApiStopServicesResponse>(url);
  }
}
