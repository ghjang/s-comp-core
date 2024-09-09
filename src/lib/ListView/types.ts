export type StyleProps = Record<string, string>;

export type Header = {
  displayNames?: string[];
  fieldNames: string[];
  style?: StyleProps | StyleProps[];
};

export type Row = {
  style?: StyleProps;
  [key: string]: unknown;
};

// 'IndexedDB' store 정보
export type Store = {
  dbName: string;
  dbVersion: number;
  storeName: string;
  keyPath?: string;
  indexes?: { name: string; keyPath: string | string[]; unique: boolean }[];
  recordCount?: number;
};
