<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { trapFocus } from "../common/action/trapFocus.js";
  import { PopUpKind } from "./PopUpKind.js";
  import { as } from "../common/util/util.js";

  type ButtonConfig = {
    text: string;
    value: string;
    userInput?: string;
  };

  type DispatchEvents = {
    buttonClicked: ButtonConfig;
  };

  const dispatch = createEventDispatcher<DispatchEvents>();

  export let kind: PopUpKind;

  export let title = "";
  export let content = "";
  export let userInput = "";
  export let buttons: ButtonConfig[] | null = null;
  export let background = "white";

  /*
    NOTE: tabindex 값에 '9999'를 사용한 것은 'Monaco Editor' 등의 입력을
          받을 수 있는 컴포넌트가 '팝업' 아래에 있을 경우 '웹 브라우저 주소줄'을 사용자가
          선택후 'Tab'을 눌렀을 때 '팝업' 내에 있는 요소에 포커스가 가는 것이 아니라
          팝업 요소 레이어 아래에 있는 요소로 포커스가 이동하는 것을 방지하기 위함이다.

    NOTE: 주소줄을 선택후 'Tab'과 'Shift + Tab'의 동작이 '크롬'과 '사파리'가 다르다.
   */
  const buttonTabIndex = 9999;

  let titleIcon: string;

  let promptInputElem: HTMLInputElement;
  let buttonRefs: HTMLButtonElement[] = [];

  let lastFocusedElem: HTMLElement | null = null;

  function getDefaultButtons(kind: PopUpKind): ButtonConfig[] {
    switch (kind) {
      case PopUpKind.ALERT:
      case PopUpKind.INFO:
        return [{ text: "OK", value: "ok" }];
      case PopUpKind.CONFIRM:
        return [
          { text: "OK", value: "ok" },
          { text: "Cancel", value: "cancel" },
        ];
      case PopUpKind.PROMPT:
        return [
          { text: "OK", value: "ok", userInput: "" },
          { text: "Cancel", value: "cancel", userInput: "" },
        ];
      case PopUpKind.CUSTOM:
        return [
          { text: "OK", value: "ok" },
          { text: "Cancel", value: "cancel" },
        ];
      default:
        throw new Error(`Unhandled kind: ${kind}`);
    }
  }

  function getTitleIcon(kind: PopUpKind): string {
    switch (kind) {
      case PopUpKind.ALERT:
        return "⚠️";
      case PopUpKind.INFO:
        return "ℹ️";

      case PopUpKind.CONFIRM:
      case PopUpKind.PROMPT:
      case PopUpKind.CUSTOM:
      default:
        return "";
    }
  }

  function initPopUp(): void {
    if (!kind) {
      kind = PopUpKind.ALERT; // 기본값 설정
    }

    // 'findSymbolByDescription' 함수 호출 제거

    // 'props'로 받은 'buttons' 값이 없을 경우 'kind'에 따라 기본 버튼을 설정한다.
    buttons = buttons || getDefaultButtons(kind);

    titleIcon = titleIcon || getTitleIcon(kind) ? `${getTitleIcon(kind)} ` : "";

    if (content) {
      if (kind !== PopUpKind.CUSTOM) {
        content = content.replace(/\n/g, "<br>");
      } else {
        // TODO: 'custom' 팝업 컨텐트 처리 추가
      }
    }
  }

  const setFocusOnPopUp = () => lastFocusedElem?.focus();

  initPopUp();

  onMount(() => {
    if (kind === PopUpKind.PROMPT && promptInputElem) {
      promptInputElem.focus();
      lastFocusedElem = promptInputElem;
    } else if (buttonRefs[0]) {
      buttonRefs[0].focus();
      lastFocusedElem = buttonRefs[0];
    }
  });

  function handleButtonClick(btn: ButtonConfig): void {
    if (promptInputElem) {
      btn.userInput = promptInputElem.value;
    }
    dispatch("buttonClicked", btn);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleButtonClick({ text: "esc", value: "cancel" });
    }

    if (event.key === "Enter" && event.target === promptInputElem) {
      event.preventDefault();
      event.stopPropagation();
      handleButtonClick({
        text: "Enter",
        value: "ok",
        userInput: promptInputElem.value,
      });
    }
  }

  function handleUserInputFocus(event: FocusEvent): void {
    lastFocusedElem = as<HTMLElement>(event.target);
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="popup-container"
  on:contextmenu|preventDefault|stopPropagation={setFocusOnPopUp}
  on:click|preventDefault|stopPropagation={setFocusOnPopUp}
  on:dblclick|preventDefault|stopPropagation={setFocusOnPopUp}
>
  <div
    class="popup"
    style:background
    on:keydown|stopPropagation={handleKeydown}
  >
    <div class="title"><span>{titleIcon}</span>{title}</div>
    <div class="body" use:trapFocus>
      {#if kind === PopUpKind.PROMPT}
        <div class="content">
          {@html content}
          <input
            bind:this={promptInputElem}
            class="prompt-input-text"
            type="text"
            tabindex={buttonTabIndex}
            value={userInput}
            on:focus={handleUserInputFocus}
            on:keydown={handleKeydown}
          />
        </div>
      {:else if kind === PopUpKind.CUSTOM}
        <!-- NOTE: 여기서 다시 시작! -->
        <div class="content">{@html content}</div>
      {:else}
        <div class="content">{@html content}</div>
      {/if}
      <div class="button-group">
        {#if buttons}
          {#each buttons as btn, i}
            <!-- svelte-ignore a11y-positive-tabindex -->
            <button
              bind:this={buttonRefs[i]}
              tabindex={buttonTabIndex}
              on:focus={() => (lastFocusedElem = buttonRefs[i])}
              on:click={() => handleButtonClick(btn)}
            >
              {btn.text}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>

  <!--
      NOTE: 다음 조작 상황에서의 문제점을 해결한다:
        1. 'Floor' 컴포넌트에 '수평 스플릿터'를 설정후 '좌측 팬'에 'PyRun'을 설정
        2. 'PopUp' 메뉴 발동
        3. '크롬' 웹 브라우저 주소줄을 선택후 'Shift + Tab'
        4. 팝업내 버튼 그릅에 포커스가 가지 않고 'Monaco Editor'로 포커스가 이동
   -->
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div class="trap-focus-dummy" tabindex="0" on:focus={setFocusOnPopUp}></div>
</div>

<style lang="scss">
  /* NOTE: 'pointer-events: none;'을 적용하면 해당 div에 대해서 마우스 이벤트 따위가 발생하지 않고 아래에 보이는 요소로 전달된다. */
  .popup-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 9999;
    user-select: none;

    & .popup {
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 5px 10px;
      border: 1px solid black;
      border-radius: 2px;
      box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
      font-family: Arial, Helvetica, sans-serif;

      & .title {
        width: 100%;
        text-align: left;
        font-weight: bold;
      }

      & .body {
        & .content {
          width: 100%;
          margin: 10px 5px;
          font-size: 0.7em;
          text-align: left;
          user-select: text;

          & .prompt-input-text {
            display: block;
            width: 90%;
            margin-top: 5px;
            padding: 5px;
            outline: none;
            font-size: 0.7em;
            border: 1px solid black;
            border-radius: 2px;
          }
        }

        & .button-group {
          width: 100%;
          display: flex;
          justify-content: flex-end;

          & button:not(:last-child) {
            margin-right: 5px;
          }

          /*
            FIXME: 팝업이 최초에 오픈된 후에 자바스크립트로 첫번째 버튼에 포커스를 설정했을 때
                  사용자가 직접 탭으로 포커스를 주었을때랑 모양이 다름. 프고그래밍으로 포커스 설정시
                  '보안' 문제로 정책에 의해서 이렇게 처리된다고 함. ':focus'를 설정해서 최대한
                  맞춰주려고 했으나 일단 실패함.
           */

          & button:focus {
            outline: 1px solid blue;
            outline-offset: -2px;
            outline-style: dotted;
          }
        }
      }
    }
  }
</style>
