import { DateTime } from 'luxon';

import { mapRouteTimetableResponse } from './route-timetable.mapper';
import { ApiRouteTimetableResponse } from './route-timetable.api-service';

describe('RouteTimetableMapper frequency rules', () => {
  const timezone = 'Europe/Madrid';

  interface FrequencyCase {
    readonly description: string;
    readonly code: string;
    readonly name: string;
    readonly queryDate: string;
    readonly isHoliday?: boolean;
    readonly expectedVisible: boolean;
    readonly expectedHolidayOnly?: boolean;
    readonly includeMetadata?: boolean;
  }

  const cases: readonly FrequencyCase[] = [
    {
      description: 'includes weekday services for L-V codes on Mondays',
      code: 'L-V',
      name: 'Lunes a viernes',
      queryDate: '2025-10-06',
      expectedVisible: true
    },
    {
      description: 'excludes L-V services on Saturdays',
      code: 'L-V',
      name: 'Lunes a viernes',
      queryDate: '2025-10-04',
      expectedVisible: false
    },
    {
      description: 'resolves fallback weekday codes without metadata',
      code: 'L-V',
      name: 'L-V',
      queryDate: '2025-10-06',
      expectedVisible: true,
      includeMetadata: false
    },
    {
      description: 'includes weekend and holiday services on Saturdays',
      code: 'S-D-F',
      name: 'Sábados, domingos y festivos',
      queryDate: '2025-10-04',
      expectedVisible: true
    },
    {
      description: 'excludes weekend and holiday services on weekdays when not a holiday',
      code: 'S-D-F',
      name: 'Sábados, domingos y festivos',
      queryDate: '2025-10-06',
      expectedVisible: false
    },
    {
      description: 'includes weekend and holiday services on weekdays when the date is a holiday',
      code: 'S-D-F',
      name: 'Sábados, domingos y festivos',
      queryDate: '2025-10-06',
      isHoliday: true,
      expectedVisible: true
    },
    {
      description: 'includes Sunday and holiday services on Sundays',
      code: 'DF',
      name: 'Domingos y Festivos',
      queryDate: '2025-10-05',
      expectedVisible: true
    },
    {
      description: 'includes Monday to Saturday services for LVSA codes',
      code: 'LVSA',
      name: 'Lunes a Sábados.',
      queryDate: '2025-10-04',
      expectedVisible: true
    },
    {
      description: 'includes Tuesday departures for daily LVSA services',
      code: 'LVSA',
      name: 'Lunes a Sábados.',
      queryDate: '2025-10-07',
      expectedVisible: true
    },
    {
      description: 'includes full-week services for LVSDF codes',
      code: 'LVSDF',
      name: 'Lunes a Domingo y festivos',
      queryDate: '2025-10-08',
      expectedVisible: true
    },
    {
      description: 'includes split weekday services for L-X-V codes on Wednesdays',
      code: 'L-X-V',
      name: 'Lunes, miercoles y viernes',
      queryDate: '2025-10-08',
      expectedVisible: true
    },
    {
      description: 'excludes split weekday services for L-X-V codes on Tuesdays',
      code: 'L-X-V',
      name: 'Lunes, miercoles y viernes',
      queryDate: '2025-10-07',
      expectedVisible: false
    },
    {
      description: 'includes Tuesday to Thursday services for M,X,J codes',
      code: 'M,X,J',
      name: 'Martes, miércoles y jueves laborables',
      queryDate: '2025-10-09',
      expectedVisible: true
    },
    {
      description: 'excludes M,X,J services outside their weekday range',
      code: 'M,X,J',
      name: 'Martes, miércoles y jueves laborables',
      queryDate: '2025-10-11',
      expectedVisible: false
    },
    {
      description: 'includes extended weekend services for JVSDF codes on Sundays',
      code: 'JVSDF',
      name: 'Jueves a domingos y festivos',
      queryDate: '2025-10-05',
      expectedVisible: true
    },
    {
      description: 'includes Sunday and holiday services on holidays even when not Sunday',
      code: 'D y F',
      name: 'Domingo y Festivos',
      queryDate: '2025-10-06',
      isHoliday: true,
      expectedVisible: true
    },
    {
      description: 'excludes Sunday and holiday services on weekdays when not a holiday',
      code: 'D y F',
      name: 'Domingo y Festivos',
      queryDate: '2025-10-06',
      expectedVisible: false
    },
    {
      description: 'marks pure holiday services as holiday only when included',
      code: 'F',
      name: 'Festivos',
      queryDate: '2025-10-06',
      isHoliday: true,
      expectedVisible: true,
      expectedHolidayOnly: true
    },
    {
      description: 'excludes pure holiday services when the date is not a holiday',
      code: 'F',
      name: 'Festivos',
      queryDate: '2025-10-06',
      expectedVisible: false
    },
    {
      description: 'includes weekday ranges expressed with spaces',
      code: 'L a V',
      name: 'LUNES A VIERNES',
      queryDate: '2025-10-08',
      expectedVisible: true
    },
    {
      description: 'includes weekend pairs expressed with conjunctions',
      code: 'S y D',
      name: 'Sábados y domingos',
      queryDate: '2025-10-05',
      expectedVisible: true
    }
  ];

  for (const testCase of cases) {
    it(testCase.description, () => {
      const response = buildResponse(testCase.code, testCase.name, testCase.includeMetadata !== false);
      const entries = mapRouteTimetableResponse(response, buildDate(testCase.queryDate), {
        timezone,
        isHoliday: testCase.isHoliday ?? false
      });

      if (testCase.expectedVisible) {
        expect(entries.length).toBe(1);
        if (testCase.expectedHolidayOnly !== undefined) {
          expect(entries[0]?.isHolidayOnly).toBe(testCase.expectedHolidayOnly);
        }
      } else {
        expect(entries.length).toBe(0);
      }
    });
  }

  it('ignores placeholder time markers when mapping departures', () => {
    const response: ApiRouteTimetableResponse = {
      bloques: [],
      horario: [
        {
          idlinea: '47',
          codigo: 'M-383',
          horas: ['08:20', '--', '08:48'],
          dias: 'L-V',
          observaciones: ''
        },
        {
          idlinea: '19',
          codigo: 'M-330',
          horas: ['--', '08:29', '08:57'],
          dias: 'L-V',
          observaciones: ''
        }
      ],
      frecuencias: [
        {
          idfrecuencia: '1',
          acronimo: 'L-V',
          nombre: 'Lunes a viernes'
        }
      ]
    } satisfies ApiRouteTimetableResponse;

    const entries = mapRouteTimetableResponse(response, buildDate('2025-10-06'), { timezone });

    expect(entries.length).toBe(2);

    const [firstEntry, secondEntry] = entries;
    const firstDeparture = DateTime.fromJSDate(firstEntry.departureTime, { zone: timezone }).toFormat('HH:mm');
    const firstArrival = DateTime.fromJSDate(firstEntry.arrivalTime, { zone: timezone }).toFormat('HH:mm');
    const secondDeparture = DateTime.fromJSDate(secondEntry.departureTime, { zone: timezone }).toFormat('HH:mm');
    const secondArrival = DateTime.fromJSDate(secondEntry.arrivalTime, { zone: timezone }).toFormat('HH:mm');

    expect(firstDeparture).toBe('08:20');
    expect(firstArrival).toBe('08:48');
    expect(secondDeparture).toBe('08:29');
    expect(secondArrival).toBe('08:57');
  });

  function buildResponse(code: string, name: string, includeMetadata: boolean): ApiRouteTimetableResponse {
    const frecuencias = includeMetadata
      ? [{ idfrecuencia: '1', acronimo: code, nombre: name }]
      : [];

    return {
      bloques: [],
      horario: [
        {
          idlinea: '1',
          codigo: 'TEST',
          horas: ['08:00', '09:00'],
          dias: code,
          observaciones: ''
        }
      ],
      frecuencias
    };
  }

  function buildDate(dateText: string): Date {
    return new Date(`${dateText}T00:00:00Z`);
  }
});
