import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StopConnectionsService } from '@data/route-search/stop-connections.service';
import { StopDirectoryStopSignature } from '@data/stops/stop-directory.service';
import { StopConnection } from '@domain/route-search/stop-connections.facade';
import { StopConnectionsFacade } from '@domain/route-search/stop-connections.facade';

describe('StopConnectionsFacade', () => {
  let facade: StopConnectionsFacade;
  let service: jasmine.SpyObj<StopConnectionsService>;

  const signatures: readonly StopDirectoryStopSignature[] = Object.freeze([
    { consortiumId: 7, stopId: '001' }
  ]);

  const forwardConnection: StopConnection = {
    consortiumId: 7,
    stopId: '001',
    originStopIds: ['001'],
    lineSignatures: [
      { lineId: 'line-1', lineCode: 'L1', direction: 0 }
    ]
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<StopConnectionsService>('StopConnectionsService', ['getConnections']);

    TestBed.configureTestingModule({
      providers: [
        StopConnectionsFacade,
        { provide: StopConnectionsService, useValue: service }
      ]
    });

    facade = TestBed.inject(StopConnectionsFacade);
  });

  it('delegates getConnections to the service', (done) => {
    const response = new Map<string, StopConnection>([[
      '7:001',
      forwardConnection
    ]]);

    service.getConnections.and.returnValue(of(response));

    facade.getConnections(signatures).subscribe((value) => {
      expect(value).toBe(response);
      done();
    });

    expect(service.getConnections).toHaveBeenCalledWith(signatures);
  });

});
