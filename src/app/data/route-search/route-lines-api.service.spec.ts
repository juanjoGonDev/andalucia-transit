import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';

describe('RouteLinesApiService', () => {
  let service: RouteLinesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    service = TestBed.inject(RouteLinesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads lines for the focused map location with CTAN geographic parameters', async () => {
    const resultPromise = firstValueFrom(
      service.getLinesNearLocation(4, { latitude: 36.7213, longitude: -4.4214 })
    );

    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'https://api.ctan.es/v1/Consorcios/4/lineas' &&
        candidate.params.get('latitud') === '36.7213' &&
        candidate.params.get('longitud') === '-4.4214'
    );
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        idLinea: 177,
        idModo: 1,
        codigo: 'M-110',
        nombre: 'Málaga-Torremolinos-Benalmádena Costa',
        modo: 'Autobús',
        operadores: 'Operador',
        hay_noticias: false
      }
    ]);

    expect(await resultPromise).toEqual([
      {
        lineId: '177',
        code: 'M-110',
        name: 'Málaga-Torremolinos-Benalmádena Costa',
        mode: 'Autobús',
        priority: 0
      }
    ]);
  });

  it('maps the official CTAN polyline into validated road coordinates', async () => {
    const resultPromise = firstValueFrom(service.getLineDetail(4, '177'));

    const request = http.expectOne('https://api.ctan.es/v1/Consorcios/4/lineas/177?lang=ES');
    expect(request.request.method).toBe('GET');
    request.flush({
      idLinea: 177,
      codigo: 'M-110',
      nombre: 'Málaga-Torremolinos-Benalmádena Costa',
      modo: 'Autobús',
      polilinea: '36.7213,-4.4214;36.7192,-4.4238;36.7168,-4.4261'
    });

    expect(await resultPromise).toEqual({
      lineId: '177',
      code: 'M-110',
      name: 'Málaga-Torremolinos-Benalmádena Costa',
      mode: 'Autobús',
      coordinates: [
        { latitude: 36.7213, longitude: -4.4214 },
        { latitude: 36.7192, longitude: -4.4238 },
        { latitude: 36.7168, longitude: -4.4261 }
      ]
    });
  });

  it('accepts longitude-latitude JSON pairs and rejects malformed geometry points', async () => {
    const resultPromise = firstValueFrom(service.getLineDetail(1, '55'));

    const request = http.expectOne('https://api.ctan.es/v1/Consorcios/1/lineas/55?lang=ES');
    request.flush({
      idLinea: 55,
      codigo: 'M-151',
      nombre: 'Sevilla-Dos Hermanas',
      modo: 'Autobús',
      polilinea: JSON.stringify([
        [-5.9845, 37.3891],
        [-5.9801, 37.3868],
        ['invalid', 37.38],
        [-999, 999]
      ])
    });

    expect((await resultPromise).coordinates).toEqual([
      { latitude: 37.3891, longitude: -5.9845 },
      { latitude: 37.3868, longitude: -5.9801 }
    ]);
  });
});
