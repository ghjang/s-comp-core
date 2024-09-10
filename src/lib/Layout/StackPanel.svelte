<svelte:options customElement="s-stack-panel" />

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FlexBox from "./FlexBox.svelte";
  import type { Direction, HAlign, VAlign } from "./types.js";

  type ForwardingCustomEvents = Record<string, unknown>;

  const dispatch = createEventDispatcher<ForwardingCustomEvents>();

  export let direction: Direction = "vertical";
  export let reverse: boolean = false;
  export let hAlign: HAlign = "center";
  export let vAlign: VAlign = "top";

  let flexDirection: "column" | "row";
  let justifyContent: string;
  let alignItems: string;

  export let trapFocus: boolean = false;

  export let defaultItemProps: Record<string, any> = {};
  export let items: any[] = [];

  export let autoRegisterCustomEventsFromItemProps: boolean = true;
  export const customEvents: string[] = [];

  export function clearRegisteredCustomEvents(): void {
    unregisterEventHandlers.forEach((unregister) => unregister());
    unregisterEventHandlers = [];
  }

  let unregisterEventHandlers: (() => void)[] = [];
  let flexBox: FlexBox;

  function registerCustomEventsFrom(flexBoxCustomEvents: string[]): void {
    customEvents.length = 0;
    customEvents.push(...flexBoxCustomEvents);

    customEvents.forEach((eventName) => {
      const unregister = flexBox.$on(eventName, (event: CustomEvent) => {
        dispatch(eventName, event.detail);
      });
      unregisterEventHandlers.push(unregister);
    });
  }

  function handleCustomEventsRegistered(
    event: CustomEvent<{ customEvents: string[] }>,
  ): void {
    clearRegisteredCustomEvents();
    registerCustomEventsFrom(event.detail.customEvents);
  }

  function reverseFlexAlign(align: string): string {
    switch (align) {
      case "flex-start":
        return "flex-end";
      case "center":
        return "center";
      case "flex-end":
        return "flex-start";
      default:
        throw new Error(`Unsupported align value: '${align}'`);
    }
  }

  function mapAlignProps(
    direction: Direction,
    hAlign: HAlign,
    vAlign: VAlign,
  ): void {
    const alignMap: Record<HAlign | VAlign, string> = {
      top: "flex-start",
      middle: "center",
      bottom: "flex-end",
      left: "flex-start",
      center: "center",
      right: "flex-end",
    };

    if (direction === "vertical") {
      if (!alignMap[vAlign] || !alignMap[hAlign]) {
        throw new Error(`Unsupported align value for '${direction}' direction`);
      }
      flexDirection = "column";
      justifyContent = reverse
        ? reverseFlexAlign(alignMap[vAlign])
        : alignMap[vAlign];
      alignItems = alignMap[hAlign];
    } else if (direction === "horizontal") {
      if (!alignMap[hAlign] || !alignMap[vAlign]) {
        throw new Error(`Unsupported align value for '${direction}' direction`);
      }
      flexDirection = "row";
      justifyContent = reverse
        ? reverseFlexAlign(alignMap[hAlign])
        : alignMap[hAlign];
      alignItems = alignMap[vAlign];
    } else {
      throw new Error(`Unsupported direction: '${direction}'`);
    }
  }

  $: mapAlignProps(direction, hAlign, vAlign);
</script>

<FlexBox
  bind:this={flexBox}
  direction={flexDirection}
  {reverse}
  {justifyContent}
  {alignItems}
  {trapFocus}
  {defaultItemProps}
  {items}
  {autoRegisterCustomEventsFromItemProps}
  on:customEventsRegistered={handleCustomEventsRegistered}
>
  <slot />
</FlexBox>
