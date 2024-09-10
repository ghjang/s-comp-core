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

  type HCollapseDirection = "rtl" | "ltr";

  type SplitterHEvents = {
    panelSizeChanged: PanelSizeInfo;
    panelSwapButtonClicked: void;
    panelOrientationButtonClicked: void;
  };

  const dispatch = createEventDispatcher<SplitterHEvents>();

  export let showContentControl: boolean | ShowContentControlOptions = false;
  export let showPanelResizingInfo = false;
  export let panel_0_length = "50%";

  let panel_0: HTMLDivElement;
  let panel_1: HTMLDivElement;
  let leftPanelCollapsed = false; // '<' 버튼을 눌러서 '왼쪽 패널'이 접혀있는지 여부
  let rightPanelCollapsed = false; // '>' 버튼을 눌러서 '오른쪽 패널'이 접혀있는지 여부
  let ltrPanelCollapseButtonClicked = false; // '>' 버튼이 눌렸었는지 여부
  let resetLtrPanelCollapseButtonClicked: (() => void) | null = null;
  let lastNonZeroPanel0Width = panel_0_length;
  let panel_0_min_width = panel_0_length;
  let panel_0_max_width = panel_0_length;
  let splitterPanelLength = "auto";

  const panelSizeUpdater = (newSize: string) => (panel_0_length = newSize);

  $: if (showContentControl) {
    resetLtrPanelCollapseButtonClicked = debounce(
      () => (ltrPanelCollapseButtonClicked = false),
      300,
    );
    splitterPanelLength = "auto";
  } else {
    resetLtrPanelCollapseButtonClicked = null;
    splitterPanelLength = "2px";
  }

  $: if (panel_0_length) {
    if (panel_0_length !== "0%" && panel_0_length !== "0px") {
      lastNonZeroPanel0Width = panel_0_length;
    }
    panel_0_min_width = panel_0_length;
    panel_0_max_width = panel_0_length;
  }

  function onPanelSizeChanged(sizeInfo: PanelSizeInfo) {
    panel_0_length = `${sizeInfo.panel_0.width}px`;
    dispatch("panelSizeChanged", sizeInfo);

    if (!showContentControl) {
      return;
    }

    leftPanelCollapsed = sizeInfo.panel_0.width === 0;

    if (ltrPanelCollapseButtonClicked) {
      // NOTE: '왼쪽 패널'이 접혀있는 상태에서 '>' 버튼을 눌러서 '오른쪽 패널'을 접는 경우에
      //       현재의 'flex box'를 이용한 레이아웃 구현에서 'onPanelSizeChanged' 이벤트가
      //       여러번 트리거 될 수 있다. 여러번 호출될 경우에 'rightPanelCollapsed = false;'가
      //       레이아웃이되는 중도에 설정되는 것으로 보이며, 결과적으로 오른쪽 패널이 완전히 접히지 앟을 수도 있다.
      //       일단 'lodash-es' 라이브러리의 'debounce' 함수를 사용해서 보완하였다.
      resetLtrPanelCollapseButtonClicked?.();
    } else if (
      (panel_1?.style.display === "none" || panel_1?.style.display === "") &&
      sizeInfo.panel_1?.width === 0
    ) {
      // NOTE:
      // - 'ltrPanelCollapseButtonClicked' 플래그를 이용해서 '>' 버튼 클릭 직후에 이 코드 블럭이
      //   실행되지 않도록 막는다.
      // - '오른쪽 패널'이 화면에 안보이고 있는 상태가 '오른쪽 패널이 접힌 상태'이다.
      // - '오른쪽 패널'이 접힌 상태에서 'divider-grip-content' 요소를 드래깅해서 '오른쪽 패널'을
      //   다시 보이게 하는 경우에 'onPanelSizeChanged' 이벤트가 여러번 트리거되는데, 첫번째 이벤트에서
      //   sizeInfo.panel_1.width 값이 0으로 시작한다.
      //
      // 위의 조건으로 '오른쪽 패널'이 '접히지 않은 상태'라는 것으로 취급한다.
      rightPanelCollapsed = false; // 'rightPanelCollapsed' 클래스 제거
    } else {
      // do nothing
    }
  }

  // NOTE: 패널의 크기값 설정시 'onPanelSizeChanged' 이벤트가 자동으로 트리거 된다.
  function handlePanelCollapseButtonClick(
    direction: HCollapseDirection = "rtl",
  ) {
    if (direction === "rtl") {
      leftPanelCollapsed = true;
      panel_0_length = "0px";
    } else if (direction === "ltr") {
      rightPanelCollapsed = true; // 'rightPanelCollapsed' 클래스 추가
      ltrPanelCollapseButtonClicked = true;
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

  // NOTE: 'SplitterV'의 'onStyleChange' 주석 참고할 것.
  function onStyleChange(computedStyle: CSSStyleDeclaration) {
    if (
      computedStyle.display !== "none" &&
      !leftPanelCollapsed &&
      !rightPanelCollapsed &&
      (panel_0.style.width === "0%" ||
        panel_0.style.width === "0px" ||
        panel_1.style.width === "0%" ||
        panel_1.style.width === "0px")
    ) {
      panel_0_length = lastNonZeroPanel0Width;
    }
  }

  // NOTE: 'slot' 요소의 'name, slot' 속성은 동적으로 설정이 불가능하다.
</script>

<div class="splitter-container">
  <div
    bind:this={panel_0}
    class="content-panel content-panel-0"
    class:ltrPanelCollapseButtonClicked
    style:width={panel_0_length}
    style:min-width={panel_0_min_width}
    style:max-width={panel_0_max_width}
    use:resizeObserver={{ panel_1, onPanelSizeChanged }}
    use:styleObserver={onStyleChange}
  >
    <slot name="left"></slot>
  </div>
  <div class="divider-panel" style:width={splitterPanelLength}>
    {#if showContentControl}
      <div
        class="divider-grip-content panel-collapse"
        use:dragGrip={{
          direction: "horizontal",
          panel_0,
          panel_1,
          panelSizeUpdater,
          showPanelResizingInfo,
        }}
      >
        {#if !rightPanelCollapsed}
          <button
            on:click|stopPropagation={() =>
              handlePanelCollapseButtonClick("ltr")}
            on:pointerdown|stopPropagation>▶</button
          >
        {/if}
        {#if shouldShowPanelSwapButton(showContentControl)}
          <button
            on:click|stopPropagation={() => handlePanelSwapButtonClick()}
            on:pointerdown|stopPropagation>⇄</button
          >
        {/if}
        {#if shouldShowToggleOrientationButton(showContentControl)}
          <button
            class="rotate-270"
            on:click|stopPropagation={() => handlePanelOrientationButtonClick()}
            on:pointerdown|stopPropagation>↺</button
          >
        {/if}
        {#if !leftPanelCollapsed}
          <button
            class="rotate-180"
            on:click|stopPropagation={() =>
              handlePanelCollapseButtonClick("rtl")}
            on:pointerdown|stopPropagation>▶</button
          >
        {/if}
      </div>
    {:else}
      <div
        class="divider-grip"
        use:dragGrip={{
          direction: "horizontal",
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
    class:rightPanelCollapsed
  >
    <slot name="right"></slot>
  </div>
</div>

<style lang="scss">
  @import "./splitter.scss";

  .splitter-container {
    flex-direction: row;

    .content-panel-0 {
      &.ltrPanelCollapseButtonClicked {
        flex-grow: 1;
        min-width: 0 !important;
        max-width: none !important;
      }
    }

    .divider-panel {
      flex-direction: row;

      .divider-grip {
        width: 1px;
        cursor: ew-resize;
      }

      .divider-grip-content {
        &.panel-collapse {
          flex-direction: column;
          min-width: 1px;
          cursor: ew-resize;
        }

        .rotate-180 {
          transform: rotate(180deg);
        }

        .rotate-270 {
          transform: rotate(270deg);
        }
      }
    }

    .content-panel-1 {
      flex-grow: 1;

      &.rightPanelCollapsed {
        display: none;
        flex-grow: 0;
      }
    }
  }
</style>
