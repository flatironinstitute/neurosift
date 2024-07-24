export interface SpikeTrainsClientType {
  startTimeSec: number | undefined;
  endTimeSec: number | undefined;
  blockSizeSec: number | undefined;
  unitIds: (number | string)[] | undefined;
  getData(
    t1: number,
    t2: number,
    o: { unitIds?: (string | number)[] },
  ): Promise<
    {
      unitId: number | string;
      spikeTimesSec: number[];
    }[]
  >;
  totalNumSpikes: number | undefined;
}
