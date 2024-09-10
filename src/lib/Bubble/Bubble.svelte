<script>
  export let message = "";
  export let sender = "user";
  export let color;
  export let bgColor;
  export let fontFamily = "Roboto, Arial, sans-serif";

  $: message = message.replace(/\n/g, "<br>");

  $: if (sender === "user") {
    color = color || "white";
    bgColor = bgColor || "#0b93f6";
  } else if (sender === "bot") {
    color = color || "black";
    bgColor = bgColor || "#e5e5ea";
  } else {
    throw new Error(`Invalid sender: ${sender}`);
  }
</script>

<div
  class="bubble {sender}"
  style:color
  style:background-color={bgColor}
  style:font-family={fontFamily}
  style="--after-border-color: {bgColor}"
>
  {#if message}
    {@html message}
  {:else}
    <slot />
  {/if}
</div>

<style lang="scss">
  .bubble {
    position: relative;
    width: fit-content;
    max-width: 80%;
    padding: 10px;
    margin: 5px;
    border-radius: 10px;

    &::after {
      content: "";
      position: absolute;
      top: 3px;
      border-width: 6px;
      border-style: solid;
      border-color: var(--after-border-color) transparent transparent
        var(--after-border-color);
    }

    &.user {
      align-self: flex-end;

      &::after {
        right: -6px;
        transform: rotate(-10deg);
      }
    }

    &.bot {
      align-self: flex-start;

      &::after {
        left: -6px;
        transform: rotate(90deg);
      }
    }
  }
</style>
