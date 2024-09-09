interface StoreConfig {
  keyPath: string;
  indexes: Array<{
    name: string;
    keyPath: string | string[];
    unique: boolean;
  }>;
}

export default class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private storeConfigs: Map<string, StoreConfig> = new Map();

  constructor(private dbName: string, private version: number) {}

  addStoreConfig(
    storeName: string,
    keyPath: string,
    indexes: Array<{
      name: string;
      keyPath: string | string[];
      unique: boolean;
    }> = []
  ): void {
    this.storeConfigs.set(storeName, { keyPath, indexes });
  }

  async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(
        this.dbName,
        this.version
      );

      request.onerror = (event: Event) =>
        reject((event.target as IDBOpenDBRequest).error);

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
        this.storeConfigs.forEach((config, storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const objectStore = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
            });
            config.indexes.forEach((index) => {
              objectStore.createIndex(index.name, index.keyPath, {
                unique: index.unique,
              });
            });
          }
        });
      };
    });
  }

  async getDatabase(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.openDatabase();
    }
    return this.db!;
  }

  async getData<T>(
    storeName: string,
    key: IDBValidKey
  ): Promise<T | undefined> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = (event: Event) =>
        reject((event.target as IDBRequest).error);
      request.onsuccess = (event: Event) =>
        resolve((event.target as IDBRequest).result);
    });
  }

  async saveData<T>(
    storeName: string,
    data: T,
    key: IDBValidKey | null = null,
    overwrite: boolean = false
  ): Promise<IDBValidKey> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      let request: IDBRequest;
      if (key !== null) {
        request = overwrite ? store.put(data, key) : store.add(data, key);
      } else {
        request = overwrite ? store.put(data) : store.add(data);
      }

      request.onerror = (event: Event) =>
        reject((event.target as IDBRequest).error);
      request.onsuccess = (event: Event) =>
        resolve((event.target as IDBRequest).result);

      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = (event: Event) =>
        reject((event.target as IDBTransaction).error);
    });
  }

  async deleteData(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = (event: Event) =>
        reject((event.target as IDBRequest).error);
      request.onsuccess = (event: Event) => resolve();
    });
  }

  async getDataByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey
  ): Promise<T[]> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onerror = (event: Event) =>
        reject((event.target as IDBRequest).error);
      request.onsuccess = (event: Event) =>
        resolve((event.target as IDBRequest).result);
    });
  }

  async getRecordCount(storeName: string): Promise<number> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();

      countRequest.onerror = (event: Event) =>
        reject((event.target as IDBRequest).error);
      countRequest.onsuccess = (event: Event) =>
        resolve((event.target as IDBRequest).result);
    });
  }

  closeDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  static async getStoreInfo(
    dbName: string,
    version: number,
    storeName: string
  ): Promise<{
    keyPath: string;
    indexes: { name: string; keyPath: string | string[]; unique: boolean }[];
    recordCount: number;
  } | null> {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(dbName, version);

      request.onerror = (event: Event) =>
        reject((event.target as IDBOpenDBRequest).error);

      request.onsuccess = (event: Event) => {
        const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains(storeName)) {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const indexes = Array.from(store.indexNames).map((indexName) => {
            const index = store.index(indexName);
            return {
              name: index.name,
              keyPath: index.keyPath,
              unique: index.unique,
            };
          });

          const countRequest = store.count();
          countRequest.onerror = (event: Event) =>
            reject((event.target as IDBRequest).error);
          countRequest.onsuccess = (event: Event) => {
            resolve({
              keyPath: store.keyPath as string,
              indexes,
              recordCount: (event.target as IDBRequest).result,
            });
            db.close();
          };
        } else {
          resolve(null);
          db.close();
        }
      };

      request.onupgradeneeded = () => {
        resolve(null);
      };
    });
  }

  static async getAllData<T>(
    dbName: string,
    version: number,
    storeName: string
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(dbName, version);

      request.onerror = (event: Event) =>
        reject((event.target as IDBOpenDBRequest).error);

      request.onsuccess = (event: Event) => {
        const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains(storeName)) {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const getAllRequest = store.getAll();

          getAllRequest.onerror = (event: Event) =>
            reject((event.target as IDBRequest).error);
          getAllRequest.onsuccess = (event: Event) =>
            resolve((event.target as IDBRequest).result);
        } else {
          resolve([]);
        }
        db.close();
      };

      request.onupgradeneeded = () => {
        resolve([]);
      };
    });
  }
}

export const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = (event: Event) =>
      resolve((event.target as IDBRequest<T>).result);
    request.onerror = (event: Event) =>
      reject((event.target as IDBRequest<T>).error);
  });
};

export const promisifyTransaction = (
  transaction: IDBTransaction
): Promise<void> => {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event: Event) =>
      reject((event.target as IDBTransaction).error);
    transaction.onabort = (event: Event) =>
      reject((event.target as IDBTransaction).error);
  });
};
