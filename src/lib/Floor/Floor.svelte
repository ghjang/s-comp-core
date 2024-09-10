<script>
  import { createEventDispatcher, tick } from "svelte";
  import Splitter from "../Splitter/Splitter.svelte";
  import TreeView from "../TreeView/TreeView.svelte";
  import ContextMenuMediator from "../ContextMenuMediator/ContextMenuMediator.svelte";
  import PopUp from "../PopUp/PopUp.svelte";
  import FloorChild from "./FloorChild.svelte";
  import { findClosestAncestor } from "../common/util/util.dom.js";
  import { restoreUnserializableProperties as restoreComponentClass } from "../common/serialization.js";
  import { updateMenuItemsInProps } from "./persistency.js";

  const dispatch = createEventDispatcher();

  export let menuItems = [];
  export let childComponentInfo = null;
  export let pattern = "honeycomb";
  export let defaultActionHandler = null;
  export let componentScriptBasePath = "";

  export let designMode = false;
  export let panel_0_length = "20%";
  export let treeViewSlot = "left";

  export let floorLevel = -1;
  export let floorId = crypto.randomUUID();

  export const customEvents = ["queryContainerInfo"];

  export const getFloorId = () => floorId;
  export const getComponentScriptBasePath = () => componentScriptBasePath;
  export const getMenuItems = () => menuItems;

  export const getAvailableFloorPatterns = () => [
    "honeycomb",
    "dots",
    "checkerboard",
    "squares",
    "stripes",
  ];

  export const setFloorPattern = (newPattern) => (pattern = newPattern);

  export const getCurrentChildComponentInfo = () =>
    floorChild?.getChildComponentInfo();

  export const resetFloor = () => floorChild?.resetFloor(floorId);
  export const removeTabFloor = (tabIndexUpdateInfo) =>
    floorChild?.removeTabFloor(floorId, tabIndexUpdateInfo);

  export const update = (focus = false) => floorChild?.update(focus);

  let contextMenu;
  let floorContainer;
  let floorChild;
  let ancestorFloorId;

  let componentTreeData = [];

  let showPopUp = false;
  let popUpProps = {};

  let panelSize = {};
  let showContentControl = { toggleOrientationButton: false };

  let highlighted = false;

  $: if (floorContainer) {
    const ancestorFloorContainer = findClosestAncestor(
      floorContainer,
      "floor-container",
    );

    // NOTE: '자식 컴포넌트'가 먼저 바인딩된다는 것을 기억할 것.
    //       아래 'floorLevel'에 대입된 값이 생성된 자식에게 나중에 전달되는
    //       실행 순서를 기억할 것.
    if (ancestorFloorContainer) {
      floorLevel = parseInt(ancestorFloorContainer.dataset.floorLevel) + 1;
      ancestorFloorId = ancestorFloorContainer.dataset.floorId;
    } else {
      floorLevel = 0;
      floorId = "floor-root";
    }
  }

  async function handleContextMenu(e) {
    designMode = floorChild?.getContextDesignMode() || designMode;
    await tick();

    if (!designMode) {
      return;
    }

    contextMenu?.showContextMenu(e);
  }

  async function handleMenuItemClicked(event) {
    if (event.detail.link) {
      const url = event.detail.link.url;
      const target = event.detail.link.target;
      if (target === "_blank") {
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    } else if (event.detail.popup) {
      // TODO: 'info' 팝업외의 다른 종류의 팝업 처리 추가
      popUpProps = { ...event.detail.popup };
      delete popUpProps.text; // '메뉴 항목' 표시용 'text' 속성을 전달하지 않는다.
      showPopUp = true;
    } else if (event.detail.action) {
      let handler = event.detail.action.handler;

      if (!handler || typeof handler !== "function") {
        if (
          defaultActionHandler &&
          typeof defaultActionHandler === "function"
        ) {
          handler = () => defaultActionHandler(event.detail.action);
        } else {
          handler = () => {
            console.warn(
              `no proper action menu item handler: ${event.detail.action.text}`,
            );
          };
        }
      }

      const newElemInfo = await handler();

      // FIXME: 'svelte:element'로 동적으로 요소 렌더링시에 불필요 '경고' 출력 제거
      // 'svelte:element'로 동적으로 요소 렌더링시에
      // "<s-marquee> was created with unknown prop 'class'"와 같은
      // '경고'가 '개발자 도구'에 출력된다. 확인결과 커스텀 요소 컴포넌트를 내부에서
      // 생성할 때 'class' 속성이 자동으로 추가되는 것으로 보인다.
      // 현재로서는 이를 해결할 방법을 찾지 못했다.
      childComponentInfo = newElemInfo;
    } else {
      // Do nothing
    }
  }

  function handleComponentTreeChanged(event) {
    componentTreeData = event.detail.componentTreeData;
  }

  function handleTreeNodeHovered(event) {
    const hoveredNode = event.detail;
    console.log(`Node ${hoveredNode.id} is hovered`);
  }

  function handleTreeNodeSelected(event) {
    const selectedNode = event.detail;
    const targetFloorId = selectedNode.id;
    floorChild.ensureVisible(targetFloorId);
    floorChild.highlight(targetFloorId);
  }

  // NOTE: 현재 구현에서 'floor-root'의 'childComponentInfo'는 항상 'null'이다.
  //       'floor-root'의 'FloorChild' 컴포넌트에서만 'childComponentInfo'를
  //       설정하고 있다. 다른 'Floor' 컴포넌트에서는 'childComponentInfo'를
  //       'FloorChild' 컴포넌트로부터 전달받아서 설정하고 있다.
  //       이런 구조를 개선할 필요가 있다.
  //
  //       또한 'handleTreeNodeRemove'는 '디자인 모드'에서만 호출되면,
  //       'floor-root'의 'Floor' 인스턴스에서만 호출되고 있다는 점을 기억할 것.
  async function handleTreeNodeRemove(event) {
    const targetFloorId = event.detail.id;
    floorChild.resetFloor(targetFloorId);
  }

  function handleHighlightFloor(event) {
    if (floorLevel <= 0) {
      return;
    }

    highlighted = floorId === event.detail.floorId;

    if (highlighted) {
      floorContainer.addEventListener(
        "animationend",
        () => (highlighted = false),
        { once: true },
      );
    }
  }

  function handleLinkDataStore(event) {
    const dataSink = event.detail.dataSink;
    floorChild.tryToLinkDataSink(dataSink);
  }

  function handlePanelSizeChanged(event) {
    panelSize = event.detail;

    dispatch("designModeLayoutChanged", {
      treeViewSlot,
      splitterSize: panelSize.container,
      panel_0_length: `${panelSize.panel_0.width}px`,
    });
  }

  // NOTE: 'designMode=true'에서만 호출된다.
  function handlePanelSwapButtonClick(slot) {
    treeViewSlot = slot;
    if (panelSize.panel_0) {
      panel_0_length = `${panelSize.panel_0.width}px`;
    }

    dispatch("designModeLayoutChanged", {
      treeViewSlot,
      splitterSize: panelSize.container,
      panel_0_length,
    });
  }

  async function handleLoadFloorChildComponent(event) {
    const restoredInfo = await restoreComponentClass(
      event.detail.childComponentInfo,
      componentScriptBasePath,
    );
    floorId = event.detail.orgFloorId;
    childComponentInfo = updateMenuItemsInProps(restoredInfo, menuItems);
  }
</script>

<div
  bind:this={floorContainer}
  class="floor-container"
  class:highlighted
  data-floor-level={floorLevel}
  data-floor-id={floorId}
>
  {#if floorLevel === 0 && designMode}
    {#if treeViewSlot === "left"}
      <Splitter
        orientation="horizontal"
        {panel_0_length}
        {showContentControl}
        showPanelResizingInfo={designMode}
        on:panelSizeChanged={(e) => handlePanelSizeChanged(e)}
        on:panelSwapButtonClicked={() => handlePanelSwapButtonClick("right")}
      >
        <TreeView
          slot="left"
          data={componentTreeData}
          on:treeNodeHovered={handleTreeNodeHovered}
          on:treeNodeSelected={handleTreeNodeSelected}
          on:treeNodeRemove={handleTreeNodeRemove}
        />
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          slot="right"
          class="floor-box {pattern}"
          on:contextmenu|stopPropagation={handleContextMenu}
        >
          <FloorChild
            bind:this={floorChild}
            {componentScriptBasePath}
            {designMode}
            {floorLevel}
            {floorId}
            {ancestorFloorId}
            {childComponentInfo}
            {menuItems}
            on:componentTreeChanged={handleComponentTreeChanged}
            on:highlightFloor={handleHighlightFloor}
          />
          <slot />
        </div>
      </Splitter>
    {:else if treeViewSlot === "right"}
      <Splitter
        orientation="horizontal"
        {panel_0_length}
        {showContentControl}
        showPanelResizingInfo={designMode}
        on:panelSizeChanged={(e) => (panelSize = e.detail)}
        on:panelSwapButtonClicked={() => handlePanelSwapButtonClick("left")}
      >
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          slot="left"
          class="floor-box {pattern}"
          on:contextmenu|stopPropagation={handleContextMenu}
        >
          <FloorChild
            bind:this={floorChild}
            {componentScriptBasePath}
            {designMode}
            {floorLevel}
            {floorId}
            {ancestorFloorId}
            {childComponentInfo}
            {menuItems}
            on:componentTreeChanged={handleComponentTreeChanged}
            on:highlightFloor={handleHighlightFloor}
          />
          <slot />
        </div>
        <TreeView
          slot="right"
          data={componentTreeData}
          on:treeNodeHovered={handleTreeNodeHovered}
          on:treeNodeSelected={handleTreeNodeSelected}
          on:treeNodeRemove={handleTreeNodeRemove}
        />
      </Splitter>
    {/if}
  {:else}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="floor-box {pattern}"
      on:contextmenu|stopPropagation={handleContextMenu}
    >
      <FloorChild
        bind:this={floorChild}
        {componentScriptBasePath}
        {floorLevel}
        {floorId}
        {ancestorFloorId}
        {childComponentInfo}
        {menuItems}
        on:highlightFloor={handleHighlightFloor}
        on:linkDataStore={handleLinkDataStore}
        on:loadFloorChildComponent={handleLoadFloorChildComponent}
        on:queryContainerInfo
      />
      <slot />
    </div>
  {/if}
</div>

{#if designMode}
  <ContextMenuMediator
    {menuItems}
    bind:this={contextMenu}
    on:menuItemClicked={handleMenuItemClicked}
  />
{/if}

{#if showPopUp}
  <PopUp {...popUpProps} on:buttonClicked={(e) => (showPopUp = false)} />
{/if}

<style lang="scss">
  @import "./pattern.scss";
  @import "./color.scss";

  @keyframes highlight-blink {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }

  .floor-container {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    border: none;

    &.highlighted {
      position: relative;

      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid lightcoral;
        box-sizing: border-box;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        animation: highlight-blink 1s ease-in-out 2;
      }
    }

    .floor-box {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      border: none;

      &.dots {
        @include dots-pattern($primary-color, $secondary-color);
      }

      &.honeycomb {
        @include honeycomb-pattern($primary-color, $secondary-color);
      }

      &.checkerboard {
        @include checkerboard-pattern($primary-color, $secondary-color);
      }

      &.squares {
        @include squares-pattern($primary-color, $secondary-color);
      }

      &.stripes {
        @include stripes-pattern($primary-color, $secondary-color);
      }
    }
  }
</style>
