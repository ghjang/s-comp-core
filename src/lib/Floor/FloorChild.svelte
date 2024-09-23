<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import { CustomEventsRegister } from "../common/customEvents.js";
  import {
    restoreUnserializableProperties as restoreComponentClass,
    removeUnserializableProperties as cleanProps,
  } from "../common/serialization.js";
  import { FloorContext } from "./context.js";
  import {
    loadFloor,
    loadDescendentFloors,
    saveFloor,
    swapFloorData,
    updateMenuItemsInProps,
    updateFloorChildComponentProps as updateFloorProps,
  } from "./persistency.js";

  const dispatch = createEventDispatcher();

  export let floorLevel = -1;
  export let floorId = null;
  export let ancestorFloorId = null;
  export let designMode = false;

  export let componentScriptBasePath;
  export let childComponentInfo = null;
  export let menuItems = [];

  export const update = (focus = false) => childComponent?.update?.(focus);

  const contextName = "floor-context";
  const getContextInitOptions = () => ({
    floorLevel,
    floorId,
    ancestorFloorId,
    dispatch,
    setChildComponentInfo: (info) => (childComponentInfo = info),
  });

  const keyPredicate = (key) => key !== "menuItems" && !key.startsWith("$");

  let context;

  let childComponent;
  let childCustomEventsRegister;

  $: if (floorLevel >= 0) {
    const opts = getContextInitOptions();
    context = new FloorContext(contextName, opts);
  }

  $: floorLevel >= 0 && context?.updateDesignMode(designMode);

  $: if (childComponentInfo) {
    setChildComponentInfo();
  } else {
    clearChildComponentTreeData();
  }

  $: if (floorLevel >= 0 && componentScriptBasePath) {
    loadChildComponentInfo();
  }

  $: if (childComponent) {
    registerCustomEvents();
    tryToLinkThisToDataStore();
  } else {
    childCustomEventsRegister?.unregister();
    childCustomEventsRegister = null;
  }

  export const getContextDesignMode = () => context?.getContextDesignMode();

  export function getChildComponentInfo() {
    return {
      floorId,
      childComponentInfo,
    };
  }

  export const ensureVisible = (targetFloorId) =>
    context?.ensureVisible(targetFloorId);
  export const highlight = (targetFloorId) => context?.highlight(targetFloorId);
  export const resetFloor = (targetFloorId) =>
    context?.resetFloor(targetFloorId);
  export const removeTabFloor = (targetFloorId, tabIndexUpdateInfo) =>
    context?.removeTabFloor(targetFloorId, tabIndexUpdateInfo);

  export function tryToLinkDataSink(dataSink) {
    if (childComponent && childComponent.getDataStore) {
      const dataStore = childComponent.getDataStore();
      const dataProps = dataStore.dataProps;
      if (dataSink.isCompatible(dataProps)) {
        dataStore.subscribe(dataSink);
      }
    }
  }

  function registerCustomEvents() {
    childCustomEventsRegister = new CustomEventsRegister(
      dispatch,
      childComponent,
      (eventName, bubble) => {
        if (eventName === "splitterOrientationChanged") {
          context.clearReplaceIdMap();
          handleSplitterOrientationChanged(bubble);
        } else if (eventName === "splitterPanelSwapped") {
          context.clearReplaceIdMap();
          handleSplitterPanelSwapped(bubble);
        } else if (eventName === "splitterPanelSizeChanged") {
          handleSplitterPanelSizeChanged(bubble);
        } else {
          console.warn(`unhandled event: ${eventName}`);
        }
      },
      null,
      (updateCallback) => {
        updateCallback({ childComponentInfo });
        setChildComponentInfo();
      },
    );

    function handleSplitterOrientationChanged(bubble) {
      const detail = bubble.forwardingDetail;
      const orientation = detail.orientation;
      childComponentInfo.props.orientation = orientation;
      if (orientation === "horizontal") {
        childComponentInfo.componentNodeName = "Splitter(Horizontal)";
      } else if (orientation === "vertical") {
        childComponentInfo.componentNodeName = "Splitter(Vertical)";
      } else {
        console.warn(`invalid orientation: ${orientation}`);
      }
      childComponentInfo = { ...childComponentInfo };
    }

    function handleSplitterPanelSwapped(bubble) {
      const detail = bubble.forwardingDetail;
      const componentInstance_0 = detail.component_0.after.componentInstance;
      const componentInstance_1 = detail.component_1.after.componentInstance;

      const id_0 = componentInstance_0.getFloorId();
      const id_1 = componentInstance_1.getFloorId();
      swapFloorData(id_0, id_1, cleanProps(childComponentInfo, keyPredicate));
      childComponentInfo = null;
      loadChildComponentInfo();
    }

    async function handleSplitterPanelSizeChanged(bubble) {
      const detail = bubble.forwardingDetail;
      const { orientation, panel_0_length, splitterSize } = detail;
      if (childComponentInfo && panel_0_length) {
        if (orientation && splitterSize) {
          const last_panel_0_length = parseInt(panel_0_length);
          const splitterLength =
            orientation === "horizontal"
              ? splitterSize.width
              : splitterSize.height;
          const percent = (last_panel_0_length / splitterLength) * 100;
          await updateFloorProps(floorId, { panel_0_length: `${percent}%` });
        } else {
          await updateFloorProps(floorId, { panel_0_length });
        }
      }
    }
  }

  function tryToLinkThisToDataStore() {
    if (childComponent && childComponent.getDataSink) {
      const dataSink = childComponent.getDataSink();
      context?.linkDataStore(dataSink);
    }
  }

  // NOTE: 'saveFloor' 함수는 'async' 함수이다. 이 문맥에서 'await' 해주지 않아도 큰 문제는 없어 보인다.
  function setChildComponentInfo() {
    context?.updateChildComponentTreeData(childComponentInfo);
    //context?.updateChildComponentTreeData(childComponentInfo, true); // for debugging

    const cleanedChildInfo = cleanProps(childComponentInfo, keyPredicate);

    if (floorLevel === 0) {
      saveFloor({
        floorId,
        ancestorFloorId,
        childComponentInfo: cleanedChildInfo,
        nonFloorParentInfo: null,
      });
    } else {
      dispatch("queryContainerInfo", {
        infoCallback: (containerInfo) => {
          const cleanedContainerInfo = cleanProps(containerInfo, keyPredicate);
          saveFloor({
            floorId,
            ancestorFloorId,
            childComponentInfo: cleanedChildInfo,
            nonFloorParentInfo: cleanedContainerInfo,
          });
        },
      });
    }
  }

  function clearChildComponentTreeData() {
    context?.clearChildComponentTreeData();
  }

  async function loadChildComponentInfo() {
    if (floorLevel === 0) {
      const floorData = await loadFloor(floorId);
      if (floorData) {
        const restoredData = await restoreComponentClass(
          floorData,
          componentScriptBasePath,
        );
        const restoredChildInfo = updateMenuItemsInProps(
          restoredData.childComponentInfo,
          menuItems,
        );
        childComponentInfo = restoredChildInfo;
      }
    } else if (floorLevel > 0) {
      dispatch("queryContainerInfo", {
        infoCallback: async (containerInfo) => {
          if (containerInfo.containerName === "Splitter") {
            await tryToLoadSplitterChildComponent(containerInfo);
          } else if (containerInfo.containerName === "Tab") {
            await tryToLoadTabChildComponent(containerInfo);
          } else {
            console.warn(
              `unsupported containerName: ${containerInfo.containerName}`,
            );
          }
        },
      });
    }
  }

  function loadFloorChildComponent(floorData) {
    if (floorData) {
      const newInvalidFloorId = floorId;
      const orgFloodId = floorData.floorId;
      context?.updateInvalidFloorIdInfo(newInvalidFloorId, orgFloodId);
      dispatch("loadFloorChildComponent", {
        orgFloorId: floorData.floorId,
        childComponentInfo: floorData.childComponentInfo,
      });
    } else {
      // 'null', 즉 '자식 컴포넌트가 설정되지 않은 상태' 또는 '데이터 오류'인 경우

      // 'null'인 경우는
      // 'floorId'를 '고정' 시켜 처리를 단순화 하기 위해서 '널 컴포넌트'를 설정해준다.
      childComponentInfo = {
        customElementName: "null",
      };
    }
  }

  async function tryToLoadSplitterChildComponent(containerInfo) {
    const floors = await loadDescendentFloors(ancestorFloorId);

    if (floors.length < 0 || floors.length > 2) {
      console.warn(
        `invalid splitter's direct descendent floor count: ${floors.length}`,
      );
      return;
    }

    const splitterPanelFloorData = floors.find((floor) => {
      const nonFloorParentInfo = floor.nonFloorParentInfo;

      // 'IndexedDB'에 저장된 'nonFloorParentInfo'의 'containerName'이
      // '런타임'에 설정된 'containerInfo'의 'containerName'과 다른 경우,
      // 즉 '저장 오류' 또는 '데이터 오류'인 경우는 무시한다.
      if (nonFloorParentInfo.containerName !== containerInfo.containerName) {
        console.warn(
          `containerName is different: ${nonFloorParentInfo.containerName}, ${containerInfo.containerName}`,
        );
        return false;
      }

      // 로딩된 2개의 'descendent floor' 중에서
      // 'Splitter'의 같은 '컨텐트 패널' 위치에서 있는 'floor'를 찾기 위한 조건
      const hasComponent_0 =
        nonFloorParentInfo.component_0 && containerInfo.component_0;
      const hasComponent_1 =
        nonFloorParentInfo.component_1 && containerInfo.component_1;
      return hasComponent_0 || hasComponent_1;
    });

    loadFloorChildComponent(splitterPanelFloorData);
  }

  async function tryToLoadTabChildComponent(containerInfo) {
    const floors = await loadDescendentFloors(ancestorFloorId);

    if (floors.length < 0) {
      console.warn(
        `invalid tab's direct descendent floor count: ${floors.length}`,
      );
      return;
    }

    const tabFloorData = floors.find((floor) => {
      const nonFloorParentInfo = floor.nonFloorParentInfo;

      // 'IndexedDB'에 저장된 'nonFloorParentInfo'의 'containerName'이
      // '런타임'에 설정된 'containerInfo'의 'containerName'과 다른 경우,
      // 즉 '저장 오류' 또는 '데이터 오류'인 경우는 무시한다.
      if (nonFloorParentInfo.containerName !== containerInfo.containerName) {
        console.warn(
          `containerName is different: ${nonFloorParentInfo.containerName}, ${containerInfo.containerName}`,
        );
        return false;
      }

      // 로딩된 'descendent floor'들 중에서 '같은 탭 인덱스'에 있는 'floor'를 선택
      return nonFloorParentInfo.tabIndex === containerInfo.tabIndex;
    });

    loadFloorChildComponent(tabFloorData);
  }

  onDestroy(() => context?.dispose());
</script>

{#if childComponentInfo}
  {#if childComponentInfo.componentClass}
    <svelte:component
      this={childComponentInfo.componentClass}
      bind:this={childComponent}
      {...childComponentInfo.props}
    />
  {:else if childComponentInfo.customElementName}
    <svelte:element
      this={childComponentInfo.customElementName}
      bind:this={childComponent}
      {...childComponentInfo.props}
    />
  {/if}
{/if}
