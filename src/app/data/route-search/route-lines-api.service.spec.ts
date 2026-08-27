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

  it('loads lines for the focused map location with CTAN geographic parameters', async () => {
    http.get.and.returnValue(
      of([
        {
          idLinea: 177,
          idModo: 1,
          codigo: 'M-110',
          nombre: 'Málaga-Torremolinos-Benalmádena Costa',
          modo: 'Autobús',
          operadores: 'Operador',
          hay_noticias: false
        }
      ])
    );

    const result = await firstValueFrom(
      service.getLinesNearLocation(4, { latitude: 36.7213, longitude: -4.4214 })
    );

    expect(http.get).toHaveBeenCalledOnceWith('https://api.ctan.es/v1/Consorcios/4/lineas', {
      params: {
        latitud: '36.7213',
        longitud: '-4.4214'
      }
    });
    expect(result).toEqual([
      {
        lineId: '177',
        code: 'M-110',
        name: 'Málaga-Torremolinos-Benalmádena Costa',
        mode: 'Autobús',
        priority: 0
      }
    ]);
  });

  it('loads stop lines from the canonical CTAN lineasPorParadas route', async () => {
    http.get.and.returnValue(
      of([
        {
          idLinea: 380,
          codigo: 'M-380',
          nombre: 'Almería - Aguadulce - El Ejido',
          modo: 'Autobús'
        }
      ])
    );

    const result = await firstValueFrom(service.getLinesForStops(4, ['625', '627']));

    expect(http.get).toHaveBeenCalledOnceWith(
      'https://api.ctan.es/v1/Consorcios/4/lineasPorParadas/625/627',
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

  it('uses the historical paradas example route only when the canonical stop-line route fails', async () => {
    http.get.and.returnValues(
      throwError(() => new Error('canonical route unavailable')),
      of([
        {
          idLinea: 370,
          codigo: 'M-370',
          nombre: 'Almería - Aguadulce - El Ejido - Dalías - Berja',
          modo: 'Autobús'
        }
      ])
    );

    const result = await firstValueFrom(service.getLinesForStops(4, ['625']));

    expect(http.get.calls.allArgs()).toEqual([
      [
        'https://api.ctan.es/v1/Consorcios/4/lineasPorParadas/625',
        { params: { lang: 'ES' } }
      ],
      [
        'https://api.ctan.es/v1/Consorcios/4/paradas/lineasPorParadas/625',
        { params: { lang: 'ES' } }
      ]
    ]);
    expect(result[0]).toEqual(
      jasmine.objectContaining({ lineId: '370', code: 'M-370', mode: 'Autobús' })
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
