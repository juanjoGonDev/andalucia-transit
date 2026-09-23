import {
  filterStopsWithinMeters,
  rankRideCandidates,
  RideCandidateStop,
  RideLineDirectionCandidate
} from './ride-candidates.util';

const USER = { latitude: 36.719472, longitude: -4.363551 }; // Almería-ish corridor
function shifted(
  from: { latitude: number; longitude: number },
  bearingDeg: number,
  meters: number
): { latitude: number; longitude: number } {
  const radians = (bearingDeg * Math.PI) / 180;
  const factor = meters / 111_320;
  return {
    latitude: from.latitude + Math.cos(radians) * factor,
    longitude: from.longitude + (Math.sin(radians) * factor) / Math.cos((from.latitude * Math.PI) / 180)
  };
}

const STOP_A: RideCandidateStop = {
  consortiumId: 3,
  stopId: '10',
  stopName: 'Almería - Pescadería',
  location: shifted(USER, 90, 120),
  distanceMeters: 0
};

const STOP_B: RideCandidateStop = {
  consortiumId: 3,
  stopId: '20',
  stopName: 'El Parador',
  location: shifted(USER, 90, 350),
  distanceMeters: 0
};

describe('ride-candidates.util', () => {
  it('drops lines heading the opposite way of the user', () => {
    const eastLeg = [shifted(STOP_A.location, 90, 2_000)];
    const westLeg = [shifted(STOP_A.location, 270, 2_000)];
    const directions: readonly RideLineDirectionCandidate[] = [
      {
        lineId: 'line-e',
        lineCode: 'M-370',
        direction: 1,
        destinationName: 'Este',
        upcomingStops: eastLeg
      },
      {
        lineId: 'line-w',
        lineCode: 'M-380',
        direction: 0,
        destinationName: 'Oeste',
        upcomingStops: westLeg
      }
    ];

    const proposals = rankRideCandidates(
      [STOP_A],
      { '3:10': directions },
      90 /* heading east */
    );

    expect(proposals.length).toBe(1);
    expect(proposals[0]?.lineId).toBe('line-e');
  });

  it('merges hits from several corridor stops into one proposal per direction', () => {
    const eastLegA = [shifted(STOP_A.location, 90, 2_000)];
    const eastLegB = [shifted(STOP_B.location, 90, 2_000)];
    const spec: Record<string, readonly RideLineDirectionCandidate[]> = {
      '3:10': [
        {
          lineId: 'line-e',
          lineCode: 'M-370',
          direction: 1,
          destinationName: 'Este',
          upcomingStops: eastLegA
        }
      ],
      '3:20': [
        {
          lineId: 'line-e',
          lineCode: 'M-370',
          direction: 1,
          destinationName: 'Este',
          upcomingStops: eastLegB
        }
      ]
    };

    const proposals = rankRideCandidates([STOP_A, STOP_B], spec, 90);

    expect(proposals.length).toBe(1);
    expect(proposals[0]?.matches).toBe(2);
  });

  it('keeps tail-of-itinerary candidates when the direction cannot be derived', () => {
    const directions: readonly RideLineDirectionCandidate[] = [
      {
        lineId: 'line-tail',
        lineCode: 'M-301',
        direction: 1,
        destinationName: 'Final',
        upcomingStops: []
      }
    ];

    const proposals = rankRideCandidates([STOP_A], { '3:10': directions }, 90);

    expect(proposals.length).toBe(1);
  });

  it('caps the proposals to the configured maximum', () => {
    const directions: readonly RideLineDirectionCandidate[] = [1, 2, 3, 4].map((index) => ({
      lineId: `line-${index}`,
      lineCode: `M-3${index}0`,
      direction: 1,
      destinationName: `Final ${index}`,
      upcomingStops: []
    }));

    const proposals = rankRideCandidates([STOP_A], { '3:10': directions }, 90);

    expect(proposals.length).toBe(3);
  });

  it('filters stops outside the corridor radius', () => {
    const far = { ...STOP_A, stopId: 'far', location: shifted(USER, 180, 4_000) };
    const near = { ...STOP_A, stopId: 'near' };

    const filtered = filterStopsWithinMeters([far, near], USER, 500);

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.stopId).toBe('near');
    expect(filtered[0]?.distanceMeters).toBeGreaterThan(0);
  });
});
