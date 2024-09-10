<svelte:options accessors />

<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { conditionalTrapFocus } from "../common/action/trapFocus.js";
  import {
    CustomEventsRegister,
    combineCustomEvents,
  } from "../common/customEvents.js";
  import type { SvelteComponent } from "svelte";
  import type { ComponentType } from "svelte";

  interface ItemProps {
    component?: ComponentType;
    [key: string]: any;
  }

  type DispatchEvents = {
    customEventsRegistered: { customEvents: string[] };
  };

  const dispatch = createEventDispatcher<DispatchEvents>();

  export let direction: "row" | "column" = "column";
  export let reverse: boolean = false;
  export let justifyContent: string = "flex-start";
  export let alignItems: string = "flex-start";

  export let trapFocus: boolean = false;

  export let defaultItemProps: Record<string, any> = {};
  export let items: Array<ItemProps> = [];

  export let autoRegisterCustomEventsFromItemProps: boolean = true;
  export const customEvents: string[] = [];

  interface ItemInstance extends SvelteComponent {
    $on: (
      eventName: string,
      handler: (event: CustomEvent) => void,
    ) => () => void;
  }

  let itemInstances: Array<ItemInstance | undefined> = [];
  let customEventsRegisters: CustomEventsRegister[] = [];

  export function clearRegisteredCustomEvents(): void {
    customEventsRegisters.forEach((register) => register.unregister());
    customEventsRegisters = [];
  }

  function registerCustomEvents(): void {
    clearRegisteredCustomEvents();
    let allCustomEvents: string[] = [];

    itemInstances.forEach((instance, index) => {
      if (!instance) return;

      const register = new CustomEventsRegister(
        dispatch,
        instance,
        (_eventName: string, _bubble: any, _component: SvelteComponent) => {
          return {
            componentName: "FlexBox",
            itemInstances,
            context: { item: items[index], index },
          };
        },
        (callback: (info: any) => void) => {
          callback({
            containerName: "FlexBox",
            itemLength: items.length,
            itemIndex: index,
          });
        },
      );

      const itemProps = { ...defaultItemProps, ...items[index] };
      if (itemProps.customEvents) {
        const detailHandler = (
          _eventName: string,
          _bubble: any,
          _component: SvelteComponent,
        ) => {
          return {
            context: { item: items[index], index },
          };
        };
        register.registerAdditionalCustomEvents(
          itemProps.customEvents,
          detailHandler,
        );
      }

      customEventsRegisters.push(register);
      allCustomEvents = combineCustomEvents(
        allCustomEvents,
        register.customEvents,
      );
    });

    customEvents.length = 0;
    customEvents.push(...allCustomEvents);
  }

  $: if (autoRegisterCustomEventsFromItemProps && items) {
    registerCustomEvents();
    dispatch("customEventsRegistered", { customEvents });
  }

  onMount(() => {
    if (autoRegisterCustomEventsFromItemProps) {
      registerCustomEvents();
      dispatch("customEventsRegistered", { customEvents });
    }
  });
</script>

<div
  class="flex-box"
  style:flex-direction={reverse ? `${direction}-reverse` : direction}
  style:justify-content={justifyContent}
  style:align-items={alignItems}
  use:conditionalTrapFocus={{ predicate: trapFocus }}
>
  {#each items as item, index}
    {@const {
      component,
      customEvents = undefined,
      ...itemProps
    } = {
      ...defaultItemProps,
      ...item,
    }}
    {#if component}
      <svelte:component
        this={component}
        bind:this={itemInstances[index]}
        {...itemProps}
      />
    {:else}
      {@html JSON.stringify({ component: undefined, ...itemProps })}
    {/if}
  {/each}

  <slot />
</div>

<style>
  /* NOTE: 'flex-box' div 영역내에서 'flex' 방식으로 '자식 요소'를 배치한다. */
  .flex-box {
    display: flex;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    flex-wrap: nowrap;
    overflow: auto;
  }
</style>
