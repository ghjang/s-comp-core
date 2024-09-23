<script lang="ts">
  import { createEventDispatcher, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import ComponentLoader from "../ComponentLoader/ComponentLoader.svelte";
  import StackPanel from "../Layout/StackPanel.svelte";
  import type { Direction, HAlign, VAlign } from "../Layout/types.js";
  import type { ToggleGroupContext, ToggleItem } from "./types.js";

  type ToggleGroupEvents = {
    toggleItemChanged: { value: any; itemIndex: number };
  };

  const dispatch = createEventDispatcher<ToggleGroupEvents>();

  export let activatedValue: unknown = null;
  export let direction: Direction = "vertical";
  export let reverse: boolean = false;
  export let hAlign: HAlign = "left";
  export let vAlign: VAlign = "top";
  export let trapFocus: boolean = false;
  export let defaultItemProps: Record<string, unknown> = {};
  export let items: Array<ToggleItem> = [];

  const contextName = "toggle-group-context";
  const context: Writable<ToggleGroupContext> = initContext(contextName);
  $: updateToggleGroupState($context);

  function initContext(ctxtName: string): Writable<ToggleGroupContext> {
    const context = writable<ToggleGroupContext>({
      activatedValue: null,
    });
    setContext(ctxtName, context);
    return context;
  }

  function updateToggleGroupState(context: ToggleGroupContext): void {}

  function handleToggleItemChanged(event: CustomEvent): void {
    const value = event.detail.bubble.forwardingDetail.value;
    $context.activatedValue = value;
    activatedValue = value;
    
    const detail = event.detail.bubble.detail;
    dispatch("toggleItemChanged", {
      value: activatedValue,
      itemIndex: detail.context.index,
    });
  }

  let loader: ComponentLoader;
  let isAllComponentsLoaded = false;

  async function loadComponents(
    loader: ComponentLoader,
    targetItems: Array<ToggleItem>,
  ): Promise<void> {
    if (!loader) {
      return;
    }

    for (let i = 0; i < targetItems.length; ++i) {
      targetItems[i] = { ...defaultItemProps, ...targetItems[i] };
    }

    await loader.loadAll(targetItems);

    targetItems.forEach((item) => {
      if (typeof item.component === "string") {
        item.component = loader.getRegisteredComponent(item.component);
      }
    });

    isAllComponentsLoaded = true;
  }

  function renderComponents(targetItems: Array<ToggleItem>): void {
    for (let i = 0; i < targetItems.length; ++i) {
      const item = targetItems[i];

      if (typeof item.component === "string") {
        const componentClass = loader.getRegisteredComponent(item.component);
        if (!componentClass) {
          // NOTE: 아직 컴포넌트에 대한 클래스 로딩이 완료되지 않은 경우 로딩을 제시도하도록 한다.
          //       이 코드는 토글링 그룹 컴포넌트에 동적으로 'items'가 변경된 경우를
          //       보완하기 위한 것이다. 현재의 로직 상에서 이 부분이 정상적으로 실행되는지
          //       테스트가 필요하다.
          isAllComponentsLoaded = false;
          return;
        }
        item.component = componentClass;
      }

      item.customEvents = ["toggleItemChanged"];
    }

    // NOTE: 이 대입문은 아래의 'rederComponents' 함수 호출을 하는 '반응형 블럭'을 '재실행'하지 않는다.
    //       스벨트는 '한 tick' 내에서 발생한 변경사항을 '한 번'만 처리하기 때문이다.
    //       물론 다른 반응형 블럭에서 'items'의 변경사항을 감지하고 있다면, 그 반응형 블럭은 재실행된다.
    //
    //       여기서 'targetItems' 참조는 'items' 참조와 동일하다. 이 실행 문맥에서 단순히 'items'에
    //       'targetItems'를 대입하는 것은 'items'의 참조를 변경하지 않는다. 그러므로 'items'의 변경사항을
    //       감지하는 반응형 블럭은 재실행되지 안게된다. 해서 '객체 복사본'을 대입해서 변경되었음을 알려야 한다.
    items = [...targetItems];
  }

  $: !isAllComponentsLoaded && loadComponents(loader, items);
  $: isAllComponentsLoaded && renderComponents(items);
  $: $context.activatedValue = activatedValue;
</script>

<ComponentLoader bind:this={loader} />

{#if isAllComponentsLoaded}
  <StackPanel
    {direction}
    {reverse}
    {hAlign}
    {vAlign}
    {trapFocus}
    {items}
    on:toggleItemChanged={handleToggleItemChanged}
  >
    <slot />
  </StackPanel>
{:else}
  <div
    class="loading-container"
    class:vertical={direction === "vertical"}
    class:right={hAlign === "right"}
    class:left={hAlign === "left"}
  >
    <div class="loading-text">Loading...</div>
  </div>
{/if}

<style lang="scss">
  .loading-container {
    display: flex;
    justify-content: flex-start; // 중앙 정렬에서 시작 정렬로 변경
    align-items: center; // 세로 중앙 정렬
    width: 100%;
    height: 100%;

    &.vertical {
      min-height: 100px;
      justify-content: center; // 세로 방향일 때는 중앙 정렬 유지

      .loading-text {
        writing-mode: vertical-lr;
        text-orientation: mixed;
      }

      &.right .loading-text {
        transform: rotate(-180deg);
      }
    }

    &.left {
      justify-content: flex-start;
    }

    &.right {
      justify-content: flex-end;
    }
  }
</style>
