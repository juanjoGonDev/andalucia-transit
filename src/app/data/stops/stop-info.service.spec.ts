import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { StopInfoRecord, StopInfoService } from './stop-info.service';

describe('StopInfoService', () => {
  let service: StopInfoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StopInfoService,
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    service = TestBed.inject(StopInfoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads stop information with the configured language parameter', () => {
    const consortiumId = 7;
    const stopNumber = '56';
    const expectedUrl = `${APP_CONFIG.apiBaseUrl}/v1/Consorcios/${consortiumId}/paradas/${stopNumber}`;

    const expected: StopInfoRecord = {
      stopNumber: '56',
      consortiumId: 7,
      nucleusId: '1',
      municipalityId: '1',
      zoneId: 'A',
      name: 'Campus Universitario-I',
      description: 'Bus stop',
      observations: 'Main road access',
      isMain: true,
      isInactive: false,
      municipality: 'Jaén',
      nucleus: 'Jaén',
      location: { latitude: 37.78574, longitude: -3.77469 },
      correspondences: ['M02-06', 'M02-07']
    };

    service.loadStopInformation(consortiumId, stopNumber, 'en').subscribe((record) => {
      expect(record).toEqual(expected);
    });

    const request = http.expectOne((req) => req.url === expectedUrl);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('lang')).toBe('EN');

    request.flush({
      idParada: '56',
      idNucleo: '1',
      idMunicipio: '1',
      idZona: 'A',
      nombre: 'Campus Universitario-I',
      descripcion: 'Bus stop',
      observaciones: 'Main road access',
      principal: '1',
      inactiva: '0',
      municipio: 'Jaén',
      nucleo: 'Jaén',
      latitud: '37.78574',
      longitud: '-3.77469',
      correspondecias: 'Correspondencia con: M02-06, M02-07'
    });
  });

  it('omits empty optional fields from the mapped record', () => {
    const consortiumId = 4;
    const stopNumber = '102';
    const expectedUrl = `${APP_CONFIG.apiBaseUrl}/v1/Consorcios/${consortiumId}/paradas/${stopNumber}`;

    const expected: StopInfoRecord = {
      stopNumber: '102',
      consortiumId: 4,
      nucleusId: null,
      municipalityId: null,
      zoneId: null,
      name: 'Avenida Central',
      description: null,
      observations: null,
      isMain: null,
      isInactive: null,
      municipality: null,
      nucleus: null,
      location: null,
      correspondences: []
    };

    service.loadStopInformation(consortiumId, stopNumber, 'es').subscribe((record) => {
      expect(record).toEqual(expected);
    });

    const request = http.expectOne((req) => req.url === expectedUrl);

    expect(request.request.params.get('lang')).toBe('ES');

    request.flush({
      idParada: '102',
      idNucleo: '',
      idMunicipio: '',
      idZona: '',
      nombre: 'Avenida Central',
      descripcion: '',
      observaciones: '',
      principal: null,
      inactiva: null,
      municipio: '',
      nucleo: '',
      latitud: null,
      longitud: null,
      correspondecias: ''
    });
  });
});
