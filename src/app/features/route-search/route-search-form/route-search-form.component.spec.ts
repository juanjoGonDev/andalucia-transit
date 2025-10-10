import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { RouteSearchFormComponent } from './route-search-form.component';
import {
  StopDirectoryOption,
  StopDirectoryService,
  StopDirectoryStopSignature,
  StopSearchRequest
} from '../../../data/stops/stop-directory.service';
import {
  StopConnection,
  StopConnectionsService,
  STOP_CONNECTION_DIRECTION,
  StopConnectionDirection,
  buildStopConnectionKey
} from '../../../data/route-search/stop-connections.service';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';

const ORIGIN_OPTION: StopDirectoryOption = {
  id: '7:origin-stop',
  code: '001',
  name: 'La Gangosa - Av. del Prado',
  municipality: 'La Gangosa',
  municipalityId: 'municipality-origin',
  nucleus: 'La Gangosa',
  nucleusId: 'nucleus-origin',
  consortiumId: 7,
  stopIds: ['origin-stop']
};

const DESTINATION_OPTION: StopDirectoryOption = {
  id: '7:destination-stop',
  code: '002',
  name: 'Estación Intermodal',
  municipality: 'Almería',
  municipalityId: 'municipality-destination',
  nucleus: 'Almería',
  nucleusId: 'nucleus-destination',
  consortiumId: 7,
  stopIds: ['destination-stop']
};

const ORIGIN_SIGNATURES: readonly StopDirectoryStopSignature[] = buildSignatures(ORIGIN_OPTION);
const DESTINATION_SIGNATURES: readonly StopDirectoryStopSignature[] = buildSignatures(DESTINATION_OPTION);

class DirectoryStub {
  lastRequest: StopSearchRequest | null = null;

  searchStops(request: StopSearchRequest) {
    this.lastRequest = request;
    if (!request.query) {
      return of([ORIGIN_OPTION, DESTINATION_OPTION]);
    }

    const normalized = request.query.toLocaleLowerCase('es-ES');
    const results = [ORIGIN_OPTION, DESTINATION_OPTION].filter((option) =>
      option.name.toLocaleLowerCase('es-ES').includes(normalized)
    );
    return of(results);
  }

  getStopById() {
    return of(null);
  }
}

class ConnectionsStub {
  private readonly responses = new Map<string, ReadonlyMap<string, StopConnection>>();

  setResponse(
    signatures: readonly StopDirectoryStopSignature[],
    direction: StopConnectionDirection,
    connections: ReadonlyMap<string, StopConnection>
  ): void {
    this.responses.set(this.buildKey(signatures, direction), connections);
  }

  getConnections(
    signatures: readonly StopDirectoryStopSignature[],
    direction: StopConnectionDirection
  ) {
    const key = this.buildKey(signatures, direction);
    return of(this.responses.get(key) ?? new Map());
  }

  private buildKey(
    signatures: readonly StopDirectoryStopSignature[],
    direction: StopConnectionDirection
  ): string {
    const sorted = [...signatures]
      .map((signature) => buildStopConnectionKey(signature.consortiumId, signature.stopId))
      .sort();
    return `${direction}|${sorted.join('|')}`;
  }
}

class TranslateLoaderStub implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('RouteSearchFormComponent', () => {
  let fixture: ComponentFixture<RouteSearchFormComponent>;
  let component: RouteSearchFormComponent;
  let connections: ConnectionsStub;

  beforeEach(async () => {
    connections = new ConnectionsStub();

    await TestBed.configureTestingModule({
      imports: [
        RouteSearchFormComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateLoaderStub }
        })
      ],
      providers: [
        { provide: StopDirectoryService, useClass: DirectoryStub },
        { provide: StopConnectionsService, useValue: connections }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteSearchFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits a selection when a compatible route exists', async () => {
    const forwardConnections = new Map<string, StopConnection>([
      [
        buildStopConnectionKey(DESTINATION_OPTION.consortiumId, DESTINATION_OPTION.stopIds[0]),
        buildConnection(DESTINATION_OPTION.stopIds[0], DESTINATION_OPTION.consortiumId)
      ]
    ]);
    const backwardConnections = new Map<string, StopConnection>([
      [
        buildStopConnectionKey(ORIGIN_OPTION.consortiumId, ORIGIN_OPTION.stopIds[0]),
        buildConnection(ORIGIN_OPTION.stopIds[0], ORIGIN_OPTION.consortiumId)
      ]
    ]);
    connections.setResponse(
      ORIGIN_SIGNATURES,
      STOP_CONNECTION_DIRECTION.Forward,
      forwardConnections
    );
    connections.setResponse(
      DESTINATION_SIGNATURES,
      STOP_CONNECTION_DIRECTION.Backward,
      backwardConnections
    );

    component.initialSelection = null;
    component.searchForm.controls.origin.setValue(ORIGIN_OPTION);
    component.searchForm.controls.destination.setValue(DESTINATION_OPTION);
    const futureDate = new Date(component.minSearchDate.getTime());
    futureDate.setDate(futureDate.getDate() + 1);
    component.searchForm.controls.date.setValue(futureDate);

    const builtSelection = await (
      component as unknown as RouteSearchFormComponentPublicApi
    ).buildSelection(
      ORIGIN_OPTION,
      DESTINATION_OPTION
    );
    expect(builtSelection).not.toBeNull();

    const emitSpy = spyOn(component.selectionConfirmed, 'emit');
    await component.submit();
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.calls.mostRecent().args[0] as RouteSearchSelection;

    expect(emitted.origin).toEqual(ORIGIN_OPTION);
    expect(emitted.destination).toEqual(DESTINATION_OPTION);
    expect(emitted.lineMatches.length).toBe(1);
  });

  it('shows the no routes feedback when nothing matches', async () => {
    component.searchForm.controls.origin.setValue(ORIGIN_OPTION);
    component.searchForm.controls.destination.setValue(DESTINATION_OPTION);

    await component.submit();
    fixture.detectChanges();

    const feedback = fixture.nativeElement.querySelector('.route-search-form__feedback');
    expect(feedback?.textContent?.trim()).not.toBeFalsy();
  });

  it('patches the form when an initial selection is provided', () => {
    const selection: RouteSearchSelection = {
      origin: ORIGIN_OPTION,
      destination: DESTINATION_OPTION,
      queryDate: new Date('2025-10-07T00:00:00Z'),
      lineMatches: [
        {
          lineId: 'line',
          lineCode: '001',
          direction: 0,
          originStopIds: ORIGIN_OPTION.stopIds,
          destinationStopIds: DESTINATION_OPTION.stopIds
        }
      ]
    };

    component.initialSelection = selection;
    component.ngOnChanges({ initialSelection: new SimpleChange(null, selection, true) });
    fixture.detectChanges();

    expect(component.searchForm.controls.origin.value).toEqual(ORIGIN_OPTION);
    expect(component.searchForm.controls.destination.value).toEqual(DESTINATION_OPTION);
  });
});

interface RouteSearchFormComponentPublicApi {
  buildSelection(
    origin: StopDirectoryOption,
    destination: StopDirectoryOption
  ): Promise<RouteSearchSelection | null>;
}

function buildConnection(stopId: string, consortiumId: number): StopConnection {
  return {
    consortiumId,
    stopId,
    originStopIds: ORIGIN_OPTION.stopIds,
    lineSignatures: [
      { lineId: 'line', lineCode: '001', direction: 0 }
    ]
  };
}

function buildSignatures(
  option: StopDirectoryOption
): readonly StopDirectoryStopSignature[] {
  return option.stopIds.map((stopId) => ({
    consortiumId: option.consortiumId,
    stopId
  }));
}
