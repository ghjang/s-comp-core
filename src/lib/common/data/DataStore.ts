import { writable } from "svelte/store";

export interface DataProps {
  sourceComponentName: string | null;
  [key: string]: any;
}

export class LinkedDataStoreInfo {
  dataProps: DataProps;
  unsubscribe: () => void;

  constructor(dataProps: DataProps, unsubscribe: () => void) {
    this.dataProps = dataProps;
    this.unsubscribe = unsubscribe;
  }
}

export abstract class DataSink {
  linkedDataStoreInfos: LinkedDataStoreInfo[] = [];

  abstract isCompatible(props: DataProps): boolean;
  abstract update(data: object): void;
}

export interface DataStore {
  dataProps: DataProps;
  subscribe(dataSink: DataSink, cleanUp: () => void): void;
  set(data: object): void;
}

export class DefaultDataStore implements DataStore {
  private store = writable({});

  dataProps: DataProps;

  constructor(dataProps: DataProps) {
    this.dataProps = dataProps;
  }

  subscribe(dataSink: DataSink, cleanUp: () => void = () => {}): void {
    const unsubscribe = this.store.subscribe((data: object) => {
      dataSink.update(data);
    });

    dataSink.linkedDataStoreInfos.push(
      new LinkedDataStoreInfo(this.dataProps, () => {
        unsubscribe();
        cleanUp();
      })
    );
  }

  set(data: object): void {
    this.store.set(data);
  }
}
