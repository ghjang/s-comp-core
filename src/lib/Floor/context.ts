import { getContext, setContext } from "svelte";
import { type Writable, writable, get } from "svelte/store";
import { deepCopy, cDiffObj } from "../common/util/util.js";
import { DataSink } from "../common/data/DataStore.js";
import type { ChildComponentInfo, FloorData } from "./types.js";
import FloorTree from "./FloorTree.js";
import {
  getAncestorFloorId,
  loadFloor,
  loadAncestorFloors,
  removeFloor,
  resetFloor,
  updateTabFloors,
} from "./persistency.js";

type UpdateId =
  | "componentTreeChange"
  | "ensureVisible"
  | "highlightFloor"
  | "resetFloor"
  | "updateInvalidFloorIdInfo"
  | "linkDataStore";

interface UpdateProps {
  updateId: UpdateId | null;
  targetFloorId: string | null;
  ancestorFloorId: string | null;
  dataSink: DataSink | null;
  replaceIdMap: Map<string, string>;
  floorData: FloorData | null;
}

interface ContextStore {
  designMode: boolean;
  maxLevel: number;
  updateProps: UpdateProps;
  floorTree: FloorTree;
}

export class FloorContext {
  #ctxName: string;
  #props: Record<string, any>;
  #contextStore: Writable<ContextStore>;
  #unsubscribe: () => void;

  constructor(ctxName: string, props: Record<string, any>) {
    this.#ctxName = ctxName;
    this.#props = props;

    if (props.floorLevel === 0) {
      this.#contextStore = writable<ContextStore>({
        designMode: !!props.designMode,
        maxLevel: 0,
        updateProps: {
          updateId: null,
          targetFloorId: null,
          ancestorFloorId: null,
          dataSink: null,
          replaceIdMap: new Map(),
          floorData: null,
        },
        floorTree: new FloorTree([
          {
            id: props.floorId,
            name: null,
            open: true,
            children: [],
            data: null,
          },
        ]),
      });
      setContext(ctxName, this.#contextStore);
    } else {
      this.#contextStore = getContext(ctxName);
    }

    this.#unsubscribe = this.#contextStore.subscribe((value) => {
      this.#updateFloorState(value);
    });

    if (props.floorLevel > 0) {
      this.#contextStore.update((value) => {
        value.updateProps.updateId = "componentTreeChange";
        if (props.floorLevel > value.maxLevel) {
          value.maxLevel = props.floorLevel;
        }
        const treeData = value.floorTree;
        treeData.appendNewEmptyNode(props.ancestorFloorId, props.floorId);
        return value;
      });
    }
  }

  dispose() {
    this.#unsubscribe();
  }

  getContextDesignMode() {
    return get(this.#contextStore).designMode;
  }

  updateDesignMode(designMode: boolean) {
    this.#props.designMode = designMode;
    if (this.#props.floorLevel === 0) {
      const ctx = get(this.#contextStore);
      ctx.designMode = designMode;
    }
  }

  async ensureVisible(targetFloorId: string) {
    const ancestorFloorData = await loadAncestorFloors(targetFloorId);
    ancestorFloorData.forEach((floorData) => {
      this.#contextStore.update((value) => {
        value.updateProps.updateId = "ensureVisible";
        value.updateProps.floorData = floorData;
        return value;
      });
    });
  }

  async highlight(targetFloorId: string) {
    const ancestorFloorId = await getAncestorFloorId(targetFloorId);
    this.#contextStore.update((value) => {
      value.updateProps.updateId = "highlightFloor";
      value.updateProps.targetFloorId = targetFloorId;
      value.updateProps.ancestorFloorId = ancestorFloorId;
      return value;
    });
  }

  resetFloor(targetFloorId: string) {
    this.#contextStore.update((value) => {
      value.updateProps.updateId = "resetFloor";
      value.updateProps.targetFloorId = targetFloorId;
      return value;
    });
  }

  /**
   * 'Tab' 컴포넌트의 '탭에 설정된 Floor 컴포넌트'를 제거할 때 호출된다.
   *
   * @param targetFloorId 제거할 탭에 설정된 Floor 컴포넌트의 ID
   * @param tabIndexUpdateInfo 탭 인덱스 업데이트 정보를 포함하는 객체
   */
  async removeTabFloor(
    targetFloorId: string,
    tabIndexUpdateInfo: Record<string, any>
  ) {
    const ancestorFloorId = await getAncestorFloorId(targetFloorId);

    // NOTE: 'IndexedDB'에서 해당 컴포넌트 정보를 '삭제'한다.
    //       '컴포넌트 트리 GUI'에서는 해당 컴포넌트를 리셋한다.
    this.resetFloor(targetFloorId);

    if (ancestorFloorId) {
      await updateTabFloors(ancestorFloorId, tabIndexUpdateInfo);
    }

    // NOTE: '컴포넌트 트리 GUI'에서 해당 컴포넌트를 삭제한다.
    //       'Splitter'의 경우와 같이 자시 컴포넌트 크기가 고정된 경우는
    //       트리 노드를 리셋만 해주는 것이 맞다. 'Tab'의 경우는 삭제된
    //       탭과 연계된 트리 노드를 삭제하는 것이 맞다.
    const ctx = get(this.#contextStore);
    ctx.floorTree.removeNode(targetFloorId);
    this.#props.dispatch("componentTreeChanged", {
      componentTreeData: ctx.floorTree.getRoot(),
    });
  }

  updateInvalidFloorIdInfo(newInvalidFloorId: string, orgFloodId: string) {
    this.#contextStore.update((value) => {
      value.updateProps.updateId = "updateInvalidFloorIdInfo";
      value.updateProps.replaceIdMap.set(newInvalidFloorId, orgFloodId);
      return value;
    });
  }

  // NOTE: 'SCompBox'의 '디자인 모드'에서 좌측의 '컴포넌트 트리' 표시를 위한 데이터를 업데이트한다.
  updateChildComponentTreeData(
    childComponentInfo: ChildComponentInfo,
    debug = false
  ) {
    this.#contextStore.update((value) => {
      value.updateProps.updateId = "componentTreeChange";
      if (this.#props.floorLevel === 0 && value.floorTree.getRoot().length === 0) {
        value.floorTree = new FloorTree([
          {
            id: "floor-root",
            name: null,
            open: true,
            children: [],
            data: null,
          },
        ]);
      }

      const beforeUpdate = debug ? deepCopy(value.floorTree) : null;

      const treeData = value.floorTree;
      treeData.updateNode(
        this.#props.floorId,
        childComponentInfo,
        value.designMode
      );

      if (beforeUpdate) {
        cDiffObj(
          beforeUpdate,
          treeData,
          `floorId: ${this.#props.floorId}, 트리 데이터 변경사항:`
        );
      }

      return value;
    });
  }

  clearChildComponentTreeData() {
    this.#contextStore.update((value) => {
      value.updateProps.updateId = "componentTreeChange";
      if (this.#props.floorLevel === 0) {
        value.floorTree = new FloorTree([]);
      } else {
        const treeData = value.floorTree;
        treeData.resetNode(this.#props.floorId);
      }
      return value;
    });
  }

  // NOTE: 'replaceIdMap'은 'IndexedDB'에 저장된 '컴포넌트 트리' 정보로부터 '로딩'시에 임시로 사용된다.
  //       최초에 컴포넌트를 구성했을때의 'id'값을 복원하기 위한 용도이다. 로딩이 끝난 후에는 필요가 없다.
  //       문제는 replaceIdMap을 'clear'시킬 시점이 언제인지가 애매하다. 현재 구현에서 모든 컴포넌트
  //       로딩 완료 시점을 판단하는 로직이 없다. 사실 이 맵 객체를 그대로 내버려두어도 메모리를 약간 소모한다는
  //       것을 빼고는 그다지 문제는 없다. 그래도 이 맵을 클리어하는 것이 안전한 시점에는 클리어하는 것이 좋겠다.
  //       'clearReplaceIdMap' 함수는 그러한 시점에 호출할 수 있도록 작성한 도우미 함수이다.
  clearReplaceIdMap() {
    const ctx = get(this.#contextStore);
    ctx.updateProps.replaceIdMap.clear();
  }

  linkDataStore(dataSink: DataSink) {
    this.#contextStore.update((value) => {
      value.updateProps.updateId = "linkDataStore";
      value.updateProps.dataSink = dataSink;
      return value;
    });
  }

  // context: '#contextStore'에 저장된 '공유 컨텍스트 객체'
  async #updateFloorState(context: ContextStore) {
    const updateProps = context.updateProps;
    switch (updateProps.updateId) {
      case "componentTreeChange":
        this.#handleComponentTreeChange(context);
        break;
      case "ensureVisible":
        this.#handleEnsureVisible(context);
        break;
      case "highlightFloor":
        this.#handleHighlightFloor(context);
        break;
      case "resetFloor":
        this.#handleResetFloor(context);
        break;
      case "updateInvalidFloorIdInfo":
        this.#handleUpdateInvalidFloorIdInfo(context);
        break;
      case "linkDataStore":
        this.#handleLinkDataStore(context);
        break;
      case null:
        // updateId가 null인 경우 처리
        break;
      default:
        // 모든 케이스가 처리되었으므로 이 부분은 실행되지 않는다.
        const _exhaustiveCheck: never = updateProps.updateId;
        break;
    }
  }

  #handleComponentTreeChange(context: ContextStore) {
    if (this.#props.floorLevel === 0) {
      // NOTE: 'root floor'에서만 업데이트해주면 된다.
      context.floorTree.removeInvalidNodes(context.updateProps.replaceIdMap);
      this.#props.dispatch("componentTreeChanged", {
        componentTreeData: context.floorTree.getRoot(),
      });
    } else {
      // do nothing
    }
  }

  #handleEnsureVisible(context: ContextStore) {
    const updateProps = context.updateProps;

    if (updateProps.floorData?.floorId !== this.#props.floorId) {
      return;
    }

    if (updateProps.floorData?.nonFloorParentInfo) {
      const tabIndex = updateProps.floorData.nonFloorParentInfo.tabIndex;

      // '이 Floor' 컴포넌트의 DOM 트리 상에서의 부모가 'Tab' 컨테이너인 경우에
      // 현재의 '이 Floor' 컴포넌트가 화면에 보이도록 한다.
      if (tabIndex) {
        this.#props.dispatch("queryContainerInfo", {
          infoCallback: async (containerInfo: Record<string, any>) => {
            if (containerInfo.containerName === "Tab") {
              containerInfo.ensureTabVisible(tabIndex);
            }
          },
        });
      }
    }

    updateProps.floorData = null;
  }

  #handleHighlightFloor(context: ContextStore) {
    const updateProps = context.updateProps;
    const targetFloorId = updateProps.targetFloorId;
    const targetAncestorFloorId = updateProps.ancestorFloorId;

    if (!targetFloorId || !targetAncestorFloorId) {
      return;
    }

    this.#props.dispatch("queryContainerInfo", {
      infoCallback: async (containerInfo: Record<string, any>) => {
        if (containerInfo.containerName === "Tab") {
          const curTabAncestorFloorId = containerInfo.ancestorFloorId;
          const curTabIndex = containerInfo.tabIndex;
          const curFloorInfo = await loadFloor(targetFloorId);
          const curFloorTabIndex = curFloorInfo?.nonFloorParentInfo?.tabIndex;
          if (
            targetAncestorFloorId === curTabAncestorFloorId &&
            curTabIndex === curFloorTabIndex
          ) {
            containerInfo.ensureTabVisible(curTabIndex);
          }
        }

        // NOTE: 'Floor' 컴포넌트의 영역이 하이라이트된다.
        this.#props.dispatch("highlightFloor", {
          floorId: targetFloorId,
        });
      },
    });
  }

  async #handleResetFloor(context: ContextStore) {
    const updateProps = context.updateProps;

    if (
      !updateProps.targetFloorId ||
      updateProps.targetFloorId !== this.#props.floorId
    ) {
      return;
    }

    if (updateProps.targetFloorId === "floor-root") {
      await removeFloor(updateProps.targetFloorId);
      this.#props.setChildComponentInfo(null);
    } else {
      // 'IndexedDB'에서 해당 컴포넌트 정보를 '리셋'한다.
      const floorData = await resetFloor(updateProps.targetFloorId);

      // '연계된 Floor 컴포넌트'에 설정된 자식 컴포넌트를 '제거'한다.
      this.#props.setChildComponentInfo(floorData?.childComponentInfo);
    }

    updateProps.replaceIdMap.clear();

    // '컴포넌트 트리 GUI'에서 해당 컴포넌트를 리셋한다.
    context.floorTree.resetNode(this.#props.floorId);
    this.#props.dispatch("componentTreeChanged", {
      componentTreeData: context.floorTree.getRoot(),
    });
  }

  #handleUpdateInvalidFloorIdInfo(context: ContextStore) {
    const updateProps = context.updateProps;
    const newInvalidFloorId = this.#props.floorId;
    if (updateProps.replaceIdMap.has(newInvalidFloorId)) {
      const orgFloorId = updateProps.replaceIdMap.get(newInvalidFloorId);
      if (orgFloorId) {
        context.floorTree.replaceNodeId(newInvalidFloorId, orgFloorId);
        this.#props.floorId = orgFloorId;
      }
    }
  }

  #handleLinkDataStore(context: ContextStore) {
    const dataSink = context.updateProps.dataSink;
    this.#props.dispatch("linkDataStore", { dataSink });
  }
}
