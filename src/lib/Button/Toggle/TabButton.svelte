<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import { type ToggleGroupContext } from "../../ToggleGroup/types.js";

  const dispatch = createEventDispatcher<{
    toggleItemChanged: { label: string; value: any };
    tabClicked: { label: string; value: any };
    tabDeleteButtonClicked: { label: string; value: any };
  }>();

  export let label: string = "";
  export let value: any;
  export let showDeleteButton: boolean = false;

  export let tabPosition: "top" | "bottom" | "left" | "right" = "top";
  export let deleteButtonClick:
    | ((label: string, value: any) => void)
    | undefined = undefined;
  export const customEvents: string[] = ["tabDeleteButtonClicked"];

  const contextName = "toggle-group-context";
  const context = getContext<Writable<ToggleGroupContext>>(contextName);
  $: updateTabButtonState($context);

  function updateTabButtonState(context: ToggleGroupContext): void {
    if (!context) {
      throw new Error(
        `The component must be used below a <ToggleGroup> parent component.`,
      );
    }
  }

  function handleToggleItemChanged(eventName: "tabClicked"): void {
    if (value && eventName === "tabClicked") {
      dispatch("toggleItemChanged", { label, value });
    }
  }

  function isKorean(text: string): boolean {
    return /[\u3131-\uD79D]/.test(text);
  }

  function handleDeleteTabButtonClick(event: MouseEvent): void {
    event.stopPropagation();

    if (deleteButtonClick) {
      deleteButtonClick(label, value);
    } else {
      dispatch("tabDeleteButtonClicked", { label, value });
    }
  }
</script>

<button
  class:selected={value === $context.activatedValue}
  class={tabPosition}
  tabindex="-1"
  on:click={() => handleToggleItemChanged("tabClicked")}
>
  {#if showDeleteButton && value === $context.activatedValue && tabPosition === "left"}
    <button class="tab-delete-button" on:click={handleDeleteTabButtonClick}
      >X</button
    >
  {/if}
  <span class={isKorean(label) ? "korean" : "english"}>{label}</span>
  {#if showDeleteButton && value === $context.activatedValue && tabPosition !== "left"}
    <button class="tab-delete-button" on:click={handleDeleteTabButtonClick}
      >X</button
    >
  {/if}
</button>

<style lang="scss">
  $button-margin: 0.2em;
  $background-color: #d0d0d0;
  $selected-background-color: #b0b0b0;

  button {
    border: none;
    border-radius: 0;
    background-color: $background-color;
    font-size: 0.7em;
    user-select: none;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;

    &:focus {
      outline: none;
    }

    &.selected {
      background-color: $selected-background-color;
      font-weight: bold;

      &.top:has(.tab-delete-button),
      &.bottom:has(.tab-delete-button) {
        padding-right: 0.25em;

        .tab-delete-button {
          margin-left: 0.3em;
          margin-right: 0;
        }
      }

      &.left:has(.tab-delete-button) {
        padding-top: 0.25em;

        .tab-delete-button {
          margin-bottom: 0.3em;
          margin-top: 0;
        }
      }

      &.right:has(.tab-delete-button) {
        padding-bottom: 0.25em;

        .tab-delete-button {
          margin-top: 0.3em;
          margin-bottom: 0;
        }
      }

      .tab-delete-button {
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 0.2em;
        padding: 0;
        width: 1.5em;
        height: 1.5em;
        background-color: transparent;
        font-size: 0.7em;
        user-select: none;
        white-space: nowrap;

        &:hover {
          background-color: darken($background-color, 25%);
        }
      }
    }

    &.top {
      margin-top: $button-margin;
      padding: 0.2em 0.5em;
      clip-path: polygon(3% 0, 97% 0, 100% 100%, 0 100%);
    }

    &.bottom {
      margin-bottom: $button-margin;
      padding: 0.2em 0.5em;
      clip-path: polygon(0 0, 100% 0, 97% 100%, 3% 100%);
    }

    &.left,
    &.right {
      writing-mode: vertical-rl;
      padding: 0.5em 0.2em;

      span {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;

        &.korean {
          text-orientation: upright;
        }

        &.english {
          text-orientation: mixed;
        }
      }
    }

    &.left {
      margin-left: $button-margin;
      clip-path: polygon(0 3%, 100% 0, 100% 100%, 0 97%);

      span.english {
        transform: rotate(180deg);
      }
    }

    &.right {
      margin-right: $button-margin;
      clip-path: polygon(0 0, 100% 3%, 100% 97%, 0 100%);
    }
  }
</style>
