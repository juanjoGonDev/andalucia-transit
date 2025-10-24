export interface CompareSnapshotPayload {
  readonly specName: string;
  readonly snapshotName: string;
  readonly threshold?: number;
}

export interface CompareSnapshotResult {
  readonly diffPixels: number;
  readonly diffPath: string;
  readonly baselineCreated: boolean;
}
