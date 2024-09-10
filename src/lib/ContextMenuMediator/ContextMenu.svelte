<script lang="ts">
  import { createEventDispatcher, getContext, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import type { MenuItem, MenuPosition, MenuSize } from "./types.js";

  type ContextMenuEvents = {
    menuItemClicked: MenuItem;
  };

  const dispatch = createEventDispatcher<ContextMenuEvents>();

  interface ContextValue {
    maxLevel: number;
    [key: `level-${number}`]: { lastHoveredMenuItem: HTMLElement | null };
  }

  export let menuItems: MenuItem[] = [];
  export let menuLevel: number = 0;
  export let menuPos: MenuPosition = { x: 0, y: 0 };
  export let menuSize: MenuSize = { width: 0, height: 0 };

  const contextName = "context-menu-context";
  const context: Writable<ContextValue> = initContext(contextName);
  $: updateMenuState($context);

  let contextMenu: HTMLDivElement;

  $: if (contextMenu) {
    menuSize = {
      width: contextMenu.offsetWidth,
      height: contextMenu.offsetHeight,
    };

    // NOTE: '디버깅'시 유용할 수 있다. 필요시 주석처리 해제하고 사용할 것.
    //console.log(menuLevel ? "sub menu" : "main menu", menuSize);

    // NOTE: '상하위 메뉴' 내용이 겹쳐서 표시되지 않도록 'z-index' 값을 설정한다.
    contextMenu.style.zIndex = `${1000 + menuLevel}`;

    /* 
      NOTE: 다음과 같이 'div.context-menu'에 바인딩된 'menuPos' 변수를 참조해 로그를 출력하면
            이 '반응형 코드 블럭'이 (무한) 재실행됨으로 주의할 것:

      console.log(menuPos);
      console.log(menuPos.x);

            HTML 템플릿에 바인딩되지 않은 'menuSize' 변수를 참조하는 다음 코드는 문제 없음:

      console.log(menuSize);

            반응형 코드 블럭 내에서 직접 'menuPos'를 참조하는 경우에 이런 문제가 있을 수 있음.
            이 코드 블럭에서 어떤 함수(ex.> updateSubMenuPos)를 호출하고 그 함수 내부에서 'menuPos'를
            참조해서 콘솔에 출력하는 경우는 이런 '무한 재실행' 문제가 없음.
     */
  }

  function initContext(ctxtName: string): Writable<ContextValue> {
    let context: Writable<ContextValue>;
    if (menuLevel === 0) {
      context = writable({
        maxLevel: 0,
        "level-0": { lastHoveredMenuItem: null },
      });
      setContext(ctxtName, context);
    } else {
      context = getContext(ctxtName);
      context.update((value) => {
        if (menuLevel > value.maxLevel) {
          value.maxLevel = menuLevel;
        }
        value[`level-${menuLevel}`] = { lastHoveredMenuItem: null };
        return value;
      });
    }
    return context;
  }

  function handleMenuItemHoverEnter(event: MouseEvent) {
    context.update((value) => {
      value[`level-${menuLevel}`].lastHoveredMenuItem =
        event.currentTarget as HTMLDivElement;
      return value;
    });
  }

  function handleMenuItemHoverLeave(event: MouseEvent) {
    context.update((value) => value);
  }

  function updateMenuState(context: ContextValue) {
    if (menuLevel <= 0 || !contextMenu || !context) {
      return;
    }

    const subMenu = contextMenu.parentElement as HTMLDivElement;
    const parentMenuItem = subMenu.closest(".menu-item") as HTMLDivElement;

    const parentHoveredMenuItem =
      context[`level-${menuLevel - 1}`].lastHoveredMenuItem;

    if (parentMenuItem !== parentHoveredMenuItem) {
      subMenu.style.display = "none";
      updateParentMenuItemState(subMenu, parentMenuItem);
      return;
    }

    // NOTE: '메뉴 항목' 자체에 ':hover' CSS로 처리하면 마우스 이동시
    //       하위 메뉴 위치가 제대로 계산되지 않는 경우가 있어서 JavaScript로 처리함.
    subMenu.style.display = "block";
    updateParentMenuItemState(subMenu, parentMenuItem);
    updateSubMenuPos(subMenu, parentMenuItem);
  }

  function isElementHidden(el: HTMLElement): boolean {
    return window.getComputedStyle(el).display === "none";
  }

  function updateParentMenuItemState(
    subMenu: HTMLDivElement,
    parentMenuItem: HTMLDivElement,
  ) {
    const parentMenuItemBtn = parentMenuItem.querySelector("button");

    if (isElementHidden(subMenu)) {
      parentMenuItemBtn?.classList.remove("parent-menu-item-hovered");
    } else {
      parentMenuItemBtn?.classList.add("parent-menu-item-hovered");
    }
  }

  function updateSubMenuPos(
    subMenu: HTMLDivElement,
    parentMenuItem: HTMLDivElement,
  ) {
    // NOTE: 'subMenu' 자체는 '크기 값'이 '0'이다.
    const subMenuWidth = contextMenu.offsetWidth;
    const subMenuHeight = contextMenu.offsetHeight;

    const parentMenu = subMenu.closest(".context-menu") as HTMLDivElement;
    const parentMenuWidth = parentMenu.offsetWidth;

    const parentMenuItemWidth = parentMenuItem.offsetWidth;

    // NOTE: '+ 2'는 '부모 메뉴 항목'의 영역과 '자식 메뉴'의 영역이 살짝 겹치게 하기 위함.
    const offsetDiff = (parentMenuWidth - parentMenuItemWidth) / 2 + 2;

    let x = parentMenu.offsetLeft + parentMenuWidth - offsetDiff;
    let y = parentMenu.offsetTop + parentMenuItem.offsetTop;

    if (x + subMenuWidth > window.innerWidth) {
      x = parentMenu.offsetLeft - subMenuWidth + offsetDiff;
    }

    if (y + subMenuHeight > window.innerHeight) {
      y = window.innerHeight - subMenuHeight;
    }

    if (x < 0) {
      x = 0;
    }

    if (y < 0) {
      y = 0;
    }

    menuPos = { x, y };
  }
</script>

<div
  bind:this={contextMenu}
  class="context-menu"
  style:left={`${menuPos.x}px`}
  style:top={`${menuPos.y}px`}
>
  {#each menuItems as item}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="menu-item"
      on:mouseenter={handleMenuItemHoverEnter}
      on:mouseleave={handleMenuItemHoverLeave}
    >
      {#if item.divider}
        <hr />
      {:else if item.link}
        <button
          class="link-btn"
          on:click|preventDefault={() => dispatch("menuItemClicked", item)}
        >
          {item.link.text}
        </button>
      {:else if item.popup}
        <button
          class="popup-btn"
          on:click|preventDefault={() => dispatch("menuItemClicked", item)}
        >
          {item.popup.text}...
        </button>
      {:else if item.action}
        <button
          class="action-btn"
          class:action-btn-checked={item.action.checked}
          on:click|preventDefault={() => dispatch("menuItemClicked", item)}
        >
          {item.action.text}
        </button>
      {:else if item.subMenu}
        <button class="sub-menu-btn" on:click|preventDefault|stopPropagation>
          {item.subMenu.text}
        </button>
        <div class="sub-menu">
          <svelte:self
            menuLevel={menuLevel + 1}
            menuItems={item.subMenu.items}
            on:menuItemClicked
          />
        </div>
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  @import "./context-menu.scss";

  // FIXME: 'global'로 선언하지 않으면 'context-menu' 내부의 'button' 요소에 'background-color'가 적용되지 않음.
  //
  // 자바스크립트를 이용해 동적으로 추가한 'parent-menu-item-hovered' 클래스가
  // 'global'로 선언되지 않으면 'context-menu' 내부의 'button' 요소에 적용되지 않음.
  // 가능하면 'global'로 선언하지 않고 'context-menu' 내부의 'button' 요소에 직접 적용하는
  // 방법을 찾아보는 것이 좋을 것 같음.
  //
  // '서브 메뉴'가 나타나 있는 상황에서 '부모 메뉴'의 해당 '메뉴 항목'을 통해서 '서브 메뉴'가
  // 나타났다는 것을 사용자에게 알려주기 위해 해당 메뉴 항목의 배경색을 변경하는 것이 목적임.
  :global(.context-menu .menu-item > button.parent-menu-item-hovered) {
    background-color: $context-menu-hover-background-color !important;
  }

  .context-menu {
    position: fixed;
    display: block;
    background-color: $context-menu-background-color;
    border: 1px solid $context-menu-border-color;
    box-shadow: $context-menu-box-shadow;
    padding: 3px;
    border-radius: 2px;
    font-family: Arial, sans-serif;

    .menu-item {
      position: relative;

      hr {
        margin: 2px 0;
        border: none;
        border-top: 1px solid $context-menu-border-color;
      }

      button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 1px 5px;
        border-radius: 1px;
        font-size: 0.5em;
        color: $context-menu-text-color;
        background: none;
        border: none;
        cursor: pointer;
        user-select: none;

        &:hover {
          background-color: $context-menu-hover-background-color;
        }

        &.link-btn:after {
          content: "🔗";
          float: right;
          padding-left: 10px;
          padding-right: 0;
        }

        &.action-btn-checked:after {
          content: "✔";
          float: right;
          padding-left: 10px;
          padding-right: 0;
          color: $context-menu-text-color;
        }

        &.sub-menu-btn:after {
          content: ">";
          float: right;
          padding-left: 10px;
          padding-right: 0;
        }
      }

      .sub-menu {
        position: absolute;
        display: none;
      }
    }
  }
</style>
