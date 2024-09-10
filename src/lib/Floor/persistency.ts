import { type FloorData } from "./types.js";
import IndexedDBManager, {
  promisifyRequest,
  promisifyTransaction,
} from "../common/data/IndexedDBManager.js";

const dbName = "SCompBox";
const dbVersion = 1;

const dbManager = new IndexedDBManager(dbName, dbVersion);

dbManager.addStoreConfig("floors", "floorId", [
  { name: "ancestorFloorId", keyPath: "ancestorFloorId", unique: false },
]);

export function getFloorRecordCount(): Promise<number> {
  return dbManager.getRecordCount("floors");
}

export async function getAncestorFloorId(
  floorId: string
): Promise<string | null> {
  const floorData = await loadFloor(floorId);
  return floorData?.ancestorFloorId || null;
}

export async function getAncestorFloorIds(floorId: string): Promise<string[]> {
  let ancestorFloorIds = [];
  let childFloorId = floorId;
  let ancestorFloorId = await getAncestorFloorId(childFloorId);
  while (ancestorFloorId) {
    ancestorFloorIds.push(ancestorFloorId);
    childFloorId = ancestorFloorId;
    ancestorFloorId = await getAncestorFloorId(childFloorId);
  }
  return ancestorFloorIds;
}

export function loadFloor(floorId: string): Promise<FloorData | undefined> {
  return dbManager.getData("floors", floorId);
}

/**
 * 주어진 floorId에 대한 모든 조상 Floor의 데이터를 로드한다.
 *
 * @param floorId - 조상을 찾을 Floor의 ID
 * @returns 조상 Floor들의 데이터 배열. 가장 가까운 조상부터 순서대로 삽입된다.
 */
export async function loadAncestorFloors(
  floorId: string
): Promise<FloorData[]> {
  let floorData: FloorData[] = [];
  let childFloorId = floorId;
  let ancestorFloorId = await getAncestorFloorId(childFloorId);
  while (ancestorFloorId) {
    const data = await loadFloor(ancestorFloorId);
    if (data) {
      floorData.push(data);
    }
    childFloorId = ancestorFloorId;
    ancestorFloorId = await getAncestorFloorId(childFloorId);
  }
  return floorData;
}

export function loadDescendentFloors(
  ancestorFloorId: string
): Promise<FloorData[]> {
  return dbManager.getDataByIndex("floors", "ancestorFloorId", ancestorFloorId);
}

export function saveFloor(
  floor: FloorData,
  overwrite = true
): Promise<IDBValidKey> {
  return dbManager.saveData("floors", floor, null, overwrite);
}

export async function resetFloor(floorId: string): Promise<FloorData | null> {
  // '리셋' 대상 플로어의 자식 플로어들은 제거한다.
  const descendents = await loadDescendentFloors(floorId);
  for (const descendent of descendents) {
    await removeFloor(descendent.floorId);
  }

  // '리셋' 대상 플로어 자체는 자식 컴포넌트 정보를 제거한다.
  const floorData = await loadFloor(floorId);
  if (floorData) {
    floorData.childComponentInfo = { customElementName: "null" };
    await saveFloor(floorData);
    return floorData;
  }

  return null;
}

export async function removeFloor(floorId: string): Promise<void> {
  await dbManager.deleteData("floors", floorId);
  const descendents = await loadDescendentFloors(floorId);
  for (const descendent of descendents) {
    await removeFloor(descendent.floorId);
  }
}

export async function swapFloorData(
  floorId_0: string,
  floorId_1: string,
  splitterInfo: { props: { component_0: any; component_1: any } }
): Promise<void> {
  const db = await dbManager.getDatabase();
  const transaction = db.transaction("floors", "readwrite");
  const store = transaction.objectStore("floors");

  try {
    const [floorData_0, floorData_1] = await Promise.all([
      promisifyRequest<FloorData>(store.get(floorId_0)),
      promisifyRequest<FloorData>(store.get(floorId_1)),
    ]);

    if (floorData_0 && floorData_1) {
      // Swap the fields except the keys
      const temp = { ...floorData_0 };
      Object.keys(floorData_0).forEach((key) => {
        if (key !== "floorId" && key !== "nonFloorParentInfo") {
          floorData_0[key] = floorData_1[key];
          floorData_1[key] = temp[key];
        }
      });

      // Perform all updates in a single transaction
      await Promise.all([
        promisifyRequest(store.put(floorData_0)),
        promisifyRequest(store.put(floorData_1)),
        swapAncestorFloorId(store, floorId_0, floorId_1),
      ]);
    } else if (floorData_0) {
      // Handle case where only floorData_0 exists
      floorData_0.floorId = floorId_1;
      floorData_0.nonFloorParentInfo = floorData_0.nonFloorParentInfo || {};
      delete floorData_0.nonFloorParentInfo.component_0;
      floorData_0.nonFloorParentInfo.component_1 =
        splitterInfo.props.component_1;

      await Promise.all([
        promisifyRequest(store.delete(floorId_0)),
        promisifyRequest(store.put(floorData_0)),
        swapAncestorFloorId(store, floorId_0, floorId_1),
      ]);
    } else if (floorData_1) {
      // Handle case where only floorData_1 exists
      floorData_1.floorId = floorId_0;
      floorData_1.nonFloorParentInfo = floorData_1.nonFloorParentInfo || {};
      delete floorData_1.nonFloorParentInfo.component_1;
      floorData_1.nonFloorParentInfo.component_0 =
        splitterInfo.props.component_0;

      await Promise.all([
        promisifyRequest(store.delete(floorId_1)),
        promisifyRequest(store.put(floorData_1)),
        swapAncestorFloorId(store, floorId_0, floorId_1),
      ]);
    }

    await promisifyTransaction(transaction);
  } catch (error) {
    transaction.abort();
    throw error;
  }
}

// NOTE: 'store.openCursor()'가 리턴하는 '객체'의 속성으로 'onsuccess'와 'onerror'가 있다.
//       때문에 'promisifyRequest'를 사용할 수 있을 것 같아 보이지만, 커서의 경우 그렇게하면
//       예상치 못한 결과가 발생하는 것을 확인했다. 이상 현상으로는 '조회 순서'가 이상하거나(?),
//       조회 자체가 제대로 이루어지지 않는 증상등이 있었다.
//
//       '단일 레코드'의 '삽입, 삭제, 갱신'건의 경우는 '1회성 작업'이기 때문에 'promisifyRequest'를
//       사용해서 코드가 간결해지고 또 정상적으로 작동하는 것을 확인했지만, '커서'와 같이 '여러 레코드'를
//       순회해야하는, 그러니까 'IndexedDB' 내부적으로 상태를 유지해야하는 경우에는 커서로 현재 레코드건을
//       참조하고 'continue()' 호출후에 'promisifyRequest'를 사용할 경우에 (아마도) 내부 커서
//       상태 조작 부분이 제대로 이루어지지 않는 것으로 보인다.
//
//       해서 일단은 아래와 같이 원래의 방식대로 'onsuccess'와 'onerror'를 직접 사용해서 처리하도록 했다.
//       한번 등록한 'onsuccess'와 'onerror' 핸들러가 '커서'가 끝날때까지 계속 재사용되는 구조로 보인다.
//
// NOTE: '성능' 개선 가능성 포인트로 필요하다면,
//       'IndexedDB'의 'transaction' 동작 방식에 대해서 좀 더 알아보는게 맞겠다.
async function swapAncestorFloorId(
  store: IDBObjectStore,
  floorId_0: string,
  floorId_1: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.openCursor();

    request.onsuccess = async (event: Event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        const value = cursor.value;

        if (value.ancestorFloorId === floorId_0) {
          value.ancestorFloorId = floorId_1;
          await promisifyRequest(cursor.update(value));
        } else if (value.ancestorFloorId === floorId_1) {
          value.ancestorFloorId = floorId_0;
          await promisifyRequest(cursor.update(value));
        }

        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = (event: Event) => {
      if (event.target instanceof IDBRequest) {
        reject(event.target.error);
      } else {
        reject(new Error("Unknown error"));
      }
    };
  });
}

export function updateMenuItemsInProps(obj: any, floorMenuItems: any[]): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => updateMenuItemsInProps(item, floorMenuItems));
  }

  const updatedObject = { ...obj };
  for (const key in updatedObject) {
    if (updatedObject.hasOwnProperty(key)) {
      const value = updatedObject[key];
      if (key === "props" && typeof value === "object" && value.menuItems) {
        updatedObject[key] = { ...value, menuItems: floorMenuItems };
      } else {
        updatedObject[key] = updateMenuItemsInProps(value, floorMenuItems);
      }
    }
  }
  return updatedObject;
}

export async function updateFloorChildComponentProps(
  floorId: string,
  props: Record<string, any>
): Promise<void> {
  const db = await dbManager.getDatabase();
  const transaction = db.transaction("floors", "readwrite");
  const store = transaction.objectStore("floors");
  const request = store.get(floorId);
  const floorData = await promisifyRequest(request);

  if (floorData && floorData.childComponentInfo) {
    floorData.childComponentInfo.props = {
      ...(floorData.childComponentInfo.props || {}),
      ...props,
    };
    await promisifyRequest(store.put(floorData));
  }

  await promisifyTransaction(transaction);
}

/*
 * 'Tab' 컴포넌트의 '탭에 설정된 Floor 컴포넌트'를 제거후 남아 있는 탭과 연계된
 * Floor 컴포넌트들에 저장된 탭 정보를 갱신한다.
 *
 * @param ancestorFloorId 제거한 탭의 상위 Floor 컴포넌트의 ID
 * @param tabIndexUpdateInfo 탭 인덱스 업데이트 정보를 포함하는 객체
 */
export async function updateTabFloors(
  ancestorFloorId: string,
  tabIndexUpdateInfo: Record<string, any>
): Promise<void> {
  const deletedTabIndex = tabIndexUpdateInfo.deletedTabIndex;
  const newTabLength = tabIndexUpdateInfo.newTabLength;

  const tabDescendents = await loadDescendentFloors(ancestorFloorId);
  for (const tabDescendent of tabDescendents) {
    if (tabDescendent.nonFloorParentInfo) {
      const tabIndex = tabDescendent.nonFloorParentInfo.tabIndex;
      if (tabIndex > deletedTabIndex) {
        tabDescendent.nonFloorParentInfo.tabIndex = tabIndex - 1;
      }
      tabDescendent.nonFloorParentInfo.tabLength = newTabLength;
      await saveFloor(tabDescendent);
    } else {
      console.warn(
        `'${tabDescendent.floorId}' floor has no nonFloorParentInfo.`
      );
    }
  }
}
