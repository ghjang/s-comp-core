<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let title;
  export let body;

  // Card styles
  export let width = "200px";
  export let height = "auto";
  export let padding = "10px";
  export let margin = "10px";
  export let border = "";
  export let borderRadius = "10px";
  export let boxShadow = "0 0px 10px 2px rgba(0, 0, 0, 0.2)";
  export let backgroundColor = "#f8f9fa";
  export let fontFamily = "Roboto, Arial, sans-serif";

  export let foldable = false;
  export let open = false;
  export let openIcon = "▼";
  export let closeIcon = "►";

  function updateCardStatus() {
    if (foldable) {
      height = open ? "auto" : "min-content";
    }
  }

  function toggleCardFolding() {
    open = !open;
    updateCardStatus();
    dispatch("cardFolding", { open });
  }

  function handleKeydown(event) {
    if (event.key === "ArrowRight") {
      open = true;
    } else if (event.key === "ArrowLeft") {
      open = false;
    }
  }

  updateCardStatus();
</script>

<div
  class="card"
  style:width
  style:height
  style:padding
  style:margin
  style:border
  style:border-radius={borderRadius}
  style:box-shadow={boxShadow}
  style:background-color={backgroundColor}
  style:font-family={fontFamily}
>
  <div class="title" class:open>
    <span>{title}</span>
    {#if foldable}
      <button on:click={toggleCardFolding} on:keydown={handleKeydown}>
        {open ? openIcon : closeIcon}
      </button>
    {/if}
  </div>
  {#if !foldable || (foldable && open)}
    <div class="body">{body}</div>
  {/if}
</div>

<style lang="scss">
  .card {
    flex-shrink: 0;
    overflow: auto;

    & > .title {
      display: flex;
      justify-content: space-between;
      font-size: 1.25em;
      font-weight: bold;

      &.open {
        margin-bottom: 10px;
      }

      button {
        background: none;
        border: none;
        cursor: pointer;
        user-select: none;
      }
    }

    & > div.body {
      font-size: 1em;
    }
  }
</style>
