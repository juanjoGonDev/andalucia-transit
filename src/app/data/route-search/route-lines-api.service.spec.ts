import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';

class HttpClientStub {
  readonly get = jasmine.createSpy('get');
}

describe('RouteLinesApiService', () => {
  let service: RouteLinesApiService;
  let http: HttpClientStub;

  beforeEach(() => {
    http = new HttpClientStub();

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    service = TestBed.inject(RouteLinesApiService);
  });

  it('discovers focused lines from nearby stops in the nearest zone', async () => {
    const stops = [
      { idParada: 15, idZona: 'A', latitud: 36.84, longitud: -2.46 },
      { idParada: 16, idZona: 'A', latitud: 36.841, longitud: -2.461 },
      { idParada: 17, idZona: 'B', latitud: 36.842, longitud: -2.462 }
    ];

    http.get.and.callFake((url: string) => {
      if (url.endsWith('/paradas')) {
        return of(stops);
      }

      if (url.endsWith('/paradas/lineasPorParadas/15')) {
        return of([
          {
            idLinea: 301,
            codigo: 'M-301',
            nombre: 'Almería - Aguadulce',
            descripcion: 'Autobús',
            prioridad: 8
          }
        ]);
      }

      if (url.endsWith('/paradas/lineasPorParadas/16')) {
        return of([
          {
            idLinea: 301,
            codigo: 'M-301',
            nombre: 'Almería - Aguadulce',
            descripcion: 'Autobús',
            prioridad: 6
          },
          {
            idLinea: 380,
            codigo: 'M-380',
            nombre: 'Almería - El Ejido',
            descripcion: 'Autobús',
            prioridad: 4
          }
        ]);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await firstValueFrom(
      service.getLinesNearLocation(7, { latitude: 36.8401, longitude: -2.4601 })
    );

    expect(http.get.calls.allArgs()).toEqual([
      [
        'https://api.ctan.es/v1/Consorcios/7/paradas',
        { params: { latitud: '36.8401', longitud: '-2.4601' } }
      ],
      [
        'https://api.ctan.es/v1/Consorcios/7/paradas/lineasPorParadas/15',
        { params: { lang: 'ES' } }
      ],
      [
        'https://api.ctan.es/v1/Consorcios/7/paradas/lineasPorParadas/16',
        { params: { lang: 'ES' } }
      ]
    ]);
    expect(result.map((line) => line.code)).toEqual(['M-301', 'M-380']);
    expect(result[0]?.priority).toBe(8);
  });

  it('loads stop lines from the CTAN paradas lineasPorParadas route without compatibility retries', async () => {
    http.get.and.returnValue(
      of([
        {
          idLinea: 380,
          codigo: 'M-380',
          nombre: 'Almería - Aguadulce - El Ejido',
          descripcion: 'Autobús'
        }
      ])
    );

    const result = await firstValueFrom(service.getLinesForStops(4, ['625', '627']));

    expect(http.get).toHaveBeenCalledOnceWith(
      'https://api.ctan.es/v1/Consorcios/4/paradas/lineasPorParadas/625/627',
      { params: { lang: 'ES' } }
    );
    expect(result).toEqual([
      {
        lineId: '380',
        code: 'M-380',
        name: 'Almería - Aguadulce - El Ejido',
        mode: 'Autobús',
        priority: 0
      }
    ]);
  });

  it('does not issue a second stop-line request when the canonical CTAN route fails', async () => {
    http.get.and.returnValue(throwError(() => new Error('CTAN unavailable')));

    await expectAsync(firstValueFrom(service.getLinesForStops(4, ['625']))).toBeRejected();

    expect(http.get).toHaveBeenCalledOnceWith(
      'https://api.ctan.es/v1/Consorcios/4/paradas/lineasPorParadas/625',
      { params: { lang: 'ES' } }
    );
  });

  it('maps the official CTAN polyline into validated road coordinates', async () => {
    http.get.and.returnValue(
      of({
        idLinea: 177,
        codigo: 'M-110',
        nombre: 'Málaga-Torremolinos-Benalmádena Costa',
        modo: 'Autobús',
        polilinea: '36.7213,-4.4214;36.7192,-4.4238;36.7168,-4.4261'
      })
    );

    const result = await firstValueFrom(service.getLineDetail(4, '177'));

    expect(http.get).toHaveBeenCalledOnceWith('https://api.ctan.es/v1/Consorcios/4/lineas/177', {
      params: { lang: 'ES' }
    });
    expect(result).toEqual({
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

  it('falls back to ordered CTAN line stops when the official polyline is absent', async () => {
    http.get.and.returnValues(
      of({
        idLinea: 380,
        codigo: 'M-380',
        nombre: 'Almería - El Ejido',
        modo: 'Autobús',
        polilinea: ''
      }),
      of([
        {
          idParada: 18,
          idLinea: 380,
          idNucleo: 1,
          idZona: 'A',
          latitud: 36.82,
          longitud: -2.44,
          nombre: 'Third',
          sentido: 1,
          orden: 3,
          modos: 1
        },
        {
          idParada: 16,
          idLinea: 380,
          idNucleo: 1,
          idZona: 'A',
          latitud: 36.84,
          longitud: -2.46,
          nombre: 'First',
          sentido: 1,
          orden: 1,
          modos: 1
        },
        {
          idParada: 17,
          idLinea: 380,
          idNucleo: 1,
          idZona: 'A',
          latitud: 36.83,
          longitud: -2.45,
          nombre: 'Second',
          sentido: 1,
          orden: 2,
          modos: 1
        },
        {
          idParada: 19,
          idLinea: 380,
          idNucleo: 1,
          idZona: 'A',
          latitud: 36.81,
          longitud: -2.43,
          nombre: 'Return',
          sentido: 2,
          orden: 1,
          modos: 1
        }
      ])
    );

    const result = await firstValueFrom(service.getLineDetail(7, '380'));

    expect(http.get.calls.allArgs()).toEqual([
      [
        'https://api.ctan.es/v1/Consorcios/7/lineas/380',
        { params: { lang: 'ES' } }
      ],
      [
        'https://api.ctan.es/v1/Consorcios/7/lineas/380/paradas',
        { params: { lang: 'ES' } }
      ]
    ]);
    expect(result.coordinates).toEqual([
      { latitude: 36.84, longitude: -2.46 },
      { latitude: 36.83, longitude: -2.45 },
      { latitude: 36.82, longitude: -2.44 }
    ]);
  });

  it('keeps the line detail usable when geometry fallback also fails', async () => {
    http.get.and.returnValues(
      of({
        idLinea: 380,
        codigo: 'M-380',
        nombre: 'Almería - El Ejido',
        modo: 'Autobús',
        polilinea: ''
      }),
      throwError(() => new Error('stops unavailable'))
    );

    const result = await firstValueFrom(service.getLineDetail(7, '380'));

    expect(result.coordinates).toEqual([]);
  });

  it('accepts longitude-latitude JSON pairs and rejects malformed geometry points', async () => {
    http.get.and.returnValue(
      of({
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
      })
    );

    const result = await firstValueFrom(service.getLineDetail(1, '55'));

    expect(http.get).toHaveBeenCalledOnceWith('https://api.ctan.es/v1/Consorcios/1/lineas/55', {
      params: { lang: 'ES' }
    });
    expect(result.coordinates).toEqual([
      { latitude: 37.3891, longitude: -5.9845 },
      { latitude: 37.3868, longitude: -5.9801 }
    ]);
  });
});
