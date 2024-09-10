<script lang="ts">
  import { debounce } from "lodash-es";
  import { createEventDispatcher } from "svelte";
  import {
    type ShowContentControlOptions,
    type PanelSizeInfo,
    shouldShowPanelSwapButton,
    shouldShowToggleOrientationButton,
  } from "./common.js";
  import { resizeObserver } from "./resizeObserver.js";
  import { styleObserver } from "./styleObserver.js";
  import { dragGrip } from "./dragGrip.js";

  type VCollapseDirection = "ttb" | "btt";

  type SplitterVEvents = {
    panelSizeChanged: PanelSizeInfo;
    panelSwapButtonClicked: void;
    panelOrientationButtonClicked: void;
  };

  const dispatch = createEventDispatcher<SplitterVEvents>();

  export let showContentControl: boolean | ShowContentControlOptions = false;
  export let showPanelResizingInfo = false;
  export let panel_0_length = "50%";

  let panel_0: HTMLDivElement;
  let panel_1: HTMLDivElement;
  let topPanelCollapsed = false;
  let bottomPanelCollapsed = false;
  let ttbPanelCollapseButtonClicked = false;
  let resetTtbPanelCollapseButtonClicked: (() => void) | null = null;
  let lastNonZeroPanel0Height = panel_0_length;
  let panel_0_min_height = panel_0_length;
  let panel_0_max_height = panel_0_length;
  let splitterPanelLength = "auto";

  const panelSizeUpdater = (newSize: string) => (panel_0_length = newSize);

  $: if (showContentControl) {
    resetTtbPanelCollapseButtonClicked = debounce(
      () => (ttbPanelCollapseButtonClicked = false),
      300,
    );
    splitterPanelLength = "auto";
  } else {
    resetTtbPanelCollapseButtonClicked = null;
    splitterPanelLength = "2px";
  }

  $: if (panel_0_length) {
    if (panel_0_length !== "0%" && panel_0_length !== "0px") {
      lastNonZeroPanel0Height = panel_0_length;
    }
    panel_0_min_height = panel_0_length;
    panel_0_max_height = panel_0_length;
  }

  function onPanelSizeChanged(panelSizeInfo: PanelSizeInfo) {
    panel_0_length = `${panelSizeInfo.panel_0.height}px`;
    dispatch("panelSizeChanged", panelSizeInfo);

    if (!showContentControl) {
      return;
    }

    topPanelCollapsed = panelSizeInfo.panel_0.height === 0;

    if (ttbPanelCollapseButtonClicked) {
      resetTtbPanelCollapseButtonClicked?.();
    } else if (
      (panel_1?.style.display === "none" || panel_1?.style.display === "") &&
      panelSizeInfo.panel_1?.height === 0
    ) {
      bottomPanelCollapsed = false; // 'bottomPanelCollapsed' 클래스 제거
    } else {
      // do nothing
    }
  }

  function handlePanelCollapseButtonClick(
    direction: VCollapseDirection = "ttb",
  ) {
    if (direction === "ttb") {
      bottomPanelCollapsed = true; // 'bottomPanelCollapsed' 클래스 추가
      ttbPanelCollapseButtonClicked = true;
    } else if (direction === "btt") {
      topPanelCollapsed = true;
      panel_0_length = "0px";
    } else {
      // do nothing
    }
  }

  function handlePanelSwapButtonClick() {
    dispatch("panelSwapButtonClicked");
  }

  function handlePanelOrientationButtonClick() {
    dispatch("panelOrientationButtonClicked");
  }

  // NOTE: 현재의 구현 방식에서 'collapse 버튼'을 클릭해서 패널을 접는 과정에서
  //       한쪽의 패널이 화면에서 사라진후(display: none)에 다시 화면에 나타날때
  //       원래의 컨텐트 패널의 크기를 유지하지 못하는 문제가 있다.
  //
  //       특히 'MonacoEditor'를 한쪽 컨텐트 패널에 설정한 'Splitter'가
  //       자식 컴포넌트로 설정된 경우에(ex.> AbcRun) 이 문제가 확실히 발생하는
  //       것으로 보인다. 아마도 모나코 에디터의 '재레이아웃' 메쏘드가 호출되면서
  //       최대한의 영역을 차지하려고 하는 것이 문제인 것으로 보인다.
  function onStyleChange(computedStyle: CSSStyleDeclaration) {
    if (
      computedStyle.display !== "none" &&
      !topPanelCollapsed &&
      !bottomPanelCollapsed &&
      (panel_0.style.height === "0%" ||
        panel_0.style.height === "0px" ||
        panel_1.style.height === "0%" ||
        panel_1.style.height === "0px")
    ) {
      panel_0_length = lastNonZeroPanel0Height;
    }
  }

  // NOTE: 'slot' 요소의 'name, slot' 속성은 동적으로 설정이 불가능하다.
</script>

<div class="splitter-container">
  <div
    bind:this={panel_0}
    class="content-panel content-panel-0"
    class:ttbPanelCollapseButtonClicked
    style:height={panel_0_length}
    style:min-height={panel_0_min_height}
    style:max-height={panel_0_max_height}
    use:resizeObserver={{ panel_1, onPanelSizeChanged, observePanel1: true }}
    use:styleObserver={onStyleChange}
  >
    <slot name="top"></slot>
  </div>
  <div class="divider-panel" style:height={splitterPanelLength}>
    {#if showContentControl}
      <div
        class="divider-grip-content panel-collapse"
        use:dragGrip={{
          direction: "vertical",
          panel_0,
          panel_1,
          panelSizeUpdater,
          showPanelResizingInfo,
        }}
      >
        {#if !topPanelCollapsed}
          <button
            on:click|stopPropagation={() =>
              handlePanelCollapseButtonClick("btt")}
            on:pointerdown|stopPropagation>▲</button
          >
        {/if}
        {#if shouldShowToggleOrientationButton(showContentControl)}
          <button
            on:click|stopPropagation={() => handlePanelOrientationButtonClick()}
            on:pointerdown|stopPropagation>↺</button
          >
        {/if}
        {#if shouldShowPanelSwapButton(showContentControl)}
          <button
            class="rotate-90"
            on:click|stopPropagation={() => handlePanelSwapButtonClick()}
            on:pointerdown|stopPropagation>⇄</button
          >
        {/if}
        {#if !bottomPanelCollapsed}
          <button
            class="rotate-180"
            on:click|stopPropagation={() =>
              handlePanelCollapseButtonClick("ttb")}
            on:pointerdown|stopPropagation>▲</button
          >
        {/if}
      </div>
    {:else}
      <div
        class="divider-grip"
        use:dragGrip={{
          direction: "vertical",
          panel_0,
          panel_1,
          panelSizeUpdater,
          showPanelResizingInfo,
        }}
      ></div>
    {/if}
  </div>
  <div
    bind:this={panel_1}
    class="content-panel content-panel-1"
    class:bottomPanelCollapsed
  >
    <slot name="bottom"></slot>
  </div>
</div>

<style lang="scss">
  @import "./splitter.scss";

  .splitter-container {
    flex-direction: column;

    .content-panel-0 {
      &.ttbPanelCollapseButtonClicked {
        flex-grow: 1;
        min-height: 0 !important;
        max-height: none !important;
      }
    }

    .divider-panel {
      flex-direction: column;

      .divider-grip {
        height: 1px;
        cursor: ns-resize;
      }

      .divider-grip-content {
        &.panel-collapse {
          flex-direction: row;
          min-height: 1px;
          cursor: ns-resize;
        }

        .rotate-90 {
          transform: rotate(90deg);
        }

        .rotate-180 {
          transform: rotate(180deg);
        }
      }
    }

    .content-panel-1 {
      flex-grow: 1;

      &.bottomPanelCollapsed {
        display: none;
        flex-grow: 0;
      }
    }
  }
</style>
