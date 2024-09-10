<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { DayNumber } from "./calendar.js";

  const dispatch = createEventDispatcher();

  export let dayNumbers: DayNumber[];
  export let selectedDayNumber: number;
  export let handleDayNumberClick: (event: MouseEvent) => void;
  export let handleDayNumberKeyDown: (event: KeyboardEvent) => void;
</script>

<div class="dayNumbers">
  {#each dayNumbers as { day, key } (key)}
    {@const dayVal = day || ""}
    <button
      tabindex="-1"
      class="dayNumber"
      class:hoverable={day}
      class:selected={selectedDayNumber === day}
      data-day={dayVal}
      on:click={handleDayNumberClick}
      on:keydown={handleDayNumberKeyDown}
      on:focus={() => dispatch("dayNumberButtonFocus", { day: dayVal })}
    >
      {dayVal}
    </button>
  {/each}
</div>

<style lang="scss">
  .dayNumbers {
    position: relative;
    display: grid;
    grid-template-rows: repeat(6, 1fr);
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    align-items: center;

    .dayNumber {
      background: none;
      border: none;
      padding: 10px;
      outline: none;

      /* '일요일'은 '빨간색'으로 표시 */
      &:nth-child(7n + 1) {
        color: red;
      }

      &.hoverable {
        border-radius: 50%;
        cursor: pointer;

        &:hover {
          background-color: lighten(darkgray, 20%);
        }

        &:focus {
          background-color: lighten(lightcoral, 20%);
        }

        &.selected {
          background-color: lightcoral;

          &:hover,
          &:focus {
            background-color: darken(lightcoral, 10%);
          }
        }
      }
    }
  }
</style>
