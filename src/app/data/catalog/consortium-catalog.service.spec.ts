import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CatalogLineEntry,
  CatalogMunicipalityEntry,
  CatalogNucleusEntry,
  ConsortiumCatalogEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';

const CATALOG_PATH = 'assets/data/catalog/index.json';
const MUNICIPALITIES_PATH = 'assets/data/catalog/consortium-6/municipalities.json';
const NUCLEI_PATH = 'assets/data/catalog/consortium-6/nuclei.json';
const LINES_PATH = 'assets/data/catalog/consortium-6/lines.json';

const catalogIndex = {
  consortia: [
    {
      id: 6,
      name: 'Área de Almería',
      shortName: 'CTAL',
      province: 'Almería',
      datasets: {
        municipalities: 'consortium-6/municipalities.json',
        nuclei: 'consortium-6/nuclei.json',
        lines: 'consortium-6/lines.json'
      }
    }
  ]
};

describe('ConsortiumCatalogService', () => {
  let service: ConsortiumCatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ConsortiumCatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and sorts traveler-readable consortium areas with canonical provinces', () => {
    let result: readonly ConsortiumCatalogEntry[] = [];
    service.loadConsortiums().subscribe((entries) => {
      result = entries;
    });

    const request = http.expectOne(CATALOG_PATH);
    request.flush({
      metadata: {
        consortiums: [
          { id: 9, name: 'Costa de Huelva', shortName: 'CTHU', province: 'Huelva' },
          { id: 6, name: 'Área de Almería', shortName: 'CTAL', province: 'Almería' }
        ]
      }
    });

    expect(result.map((entry) => entry.id)).toEqual([6, 9]);
    expect(result.map((entry) => entry.name)).toEqual(['Área de Almería', 'Costa de Huelva']);
    expect(result.map((entry) => entry.province)).toEqual(['Almería', 'Huelva']);
  });

  it('ignores malformed catalog entries and preserves missing legacy province as null', () => {
    let result: readonly ConsortiumCatalogEntry[] = [];
    service.loadConsortiums().subscribe((entries) => {
      result = entries;
    });

    http.expectOne(CATALOG_PATH).flush({
      consortia: [
        { id: 6, name: 'Área de Almería', shortName: 'CTAL' },
        { id: 'invalid', name: 'Broken' },
        null
      ]
    });

    expect(result).toEqual([
      { id: 6, name: 'Área de Almería', shortName: 'CTAL', province: null }
    ]);
  });

  it('loads municipalities and nuclei through the dataset paths owned by the catalog index', () => {
    let municipalities: readonly CatalogMunicipalityEntry[] = [];
    let nuclei: readonly CatalogNucleusEntry[] = [];

    service.loadMunicipalities(6).subscribe((entries) => {
      municipalities = entries;
    });
    service.loadNuclei(6).subscribe((entries) => {
      nuclei = entries;
    });

    http.expectOne(CATALOG_PATH).flush(catalogIndex);
    http.expectOne(MUNICIPALITIES_PATH).flush({
      municipalities: [
        { id: '2', name: 'Vícar' },
        { id: '1', name: 'Almería' },
        { id: null, name: 'Broken' }
      ]
    });
    http.expectOne(NUCLEI_PATH).flush({
      nuclei: [
        { id: '20', municipalityId: '2', zone: 'B', name: 'La Gangosa' },
        { id: '10', municipalityId: '1', zone: null, name: 'Almería' }
      ]
    });

    expect(municipalities).toEqual([
      { id: '1', name: 'Almería' },
      { id: '2', name: 'Vícar' }
    ]);
    expect(nuclei).toEqual([
      { id: '10', municipalityId: '1', zone: null, name: 'Almería' },
      { id: '20', municipalityId: '2', zone: 'B', name: 'La Gangosa' }
    ]);
  });

  it('loads sorted line metadata without creating a second line schema', () => {
    let lines: readonly CatalogLineEntry[] = [];

    service.loadLines(6).subscribe((entries) => {
      lines = entries;
    });

    http.expectOne(CATALOG_PATH).flush(catalogIndex);
    http.expectOne(LINES_PATH).flush({
      lines: [
        {
          id: '380',
          code: 'M-380',
          name: 'Second line',
          mode: 'Bus',
          operators: ['Operator B']
        },
        {
          id: '370',
          code: 'M-370',
          name: 'First line',
          mode: 'Bus',
          operators: ['Operator A']
        },
        { id: '', code: 'broken', name: 'Broken line' }
      ]
    });

    expect(lines).toEqual([
      {
        id: '370',
        code: 'M-370',
        name: 'First line',
        mode: 'Bus',
        operators: ['Operator A']
      },
      {
        id: '380',
        code: 'M-380',
        name: 'Second line',
        mode: 'Bus',
        operators: ['Operator B']
      }
    ]);
  });
});
