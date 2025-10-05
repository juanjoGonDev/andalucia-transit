export interface StopService {
  readonly serviceId: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly arrivalTime: Date;
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
}

export interface StopSchedule {
  readonly stopId: string;
  readonly stopCode: string;
  readonly stopName: string;
  readonly queryDate: Date;
  readonly generatedAt: Date;
  readonly services: readonly StopService[];
}
