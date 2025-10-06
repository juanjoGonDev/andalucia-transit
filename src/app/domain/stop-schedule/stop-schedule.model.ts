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

export type StopScheduleDataSourceType = 'api' | 'snapshot';

export interface StopScheduleDataSource {
  readonly type: StopScheduleDataSourceType;
  readonly providerName: string;
  readonly queryTime: Date;
  readonly snapshotTime: Date | null;
}

export interface StopScheduleResult {
  readonly schedule: StopSchedule;
  readonly dataSource: StopScheduleDataSource;
}
