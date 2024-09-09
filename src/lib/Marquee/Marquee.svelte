<svelte:options customElement="s-marquee" />

<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";

  type MarqueeDirection = "rtl" | "ltr" | "ttb" | "btt";

  export let text: string = "";
  export let direction: MarqueeDirection = "rtl";
  export let duration: number = 3;
  export let debug: boolean = false;
  export let color: string = "#f0f0f0";
  export let fontSize: string = "2em";

  let container: HTMLDivElement;
  let marquee: HTMLDivElement;
  let animationDuration: number;

  let observer: IntersectionObserver | null = null;

  let prevText: string = text;

  $: if (text !== prevText && marquee) {
    prevText = text;
    tick().then(() => {
      const { width, height } = marquee.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setAnimation();
      } else {
        setupObserver();
      }
    });
  }

  async function setAnimation(): Promise<void> {
    if (!marquee || !container) return;

    await tick();

    const { width, height } = marquee.getBoundingClientRect();
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    animationDuration = duration || width / 100;
    marquee.style.animationDuration = `${animationDuration}s`;
  }

  function setupObserver(): void {
    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setAnimation();
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(container);
    }
  }

  function enableDebug(
    isDebug: boolean,
    container: HTMLDivElement | undefined,
    marquee: HTMLDivElement | undefined,
  ): void {
    if (isDebug && container && marquee) {
      container.style.border = "1px solid red";
      marquee.style.border = "1px solid blue";
    } else if (container && marquee) {
      container.style.border = "none";
      marquee.style.border = "none";
    }
  }

  onMount(() => {
    const { width, height } = marquee.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setAnimation();
    } else {
      setupObserver();
    }
  });

  onDestroy(() => observer?.disconnect());

  $: enableDebug(debug, container, marquee);
</script>

<div class="marquee-wrapper" bind:this={container}>
  <div
    bind:this={marquee}
    class:marquee-rtl={direction === "rtl"}
    class:marquee-ltr={direction === "ltr"}
    class:marquee-ttb={direction === "ttb"}
    class:marquee-btt={direction === "btt"}
    style:color
    style:font-size={fontSize}
  >
    {#if text}
      {text}
    {:else}
      <slot />
    {/if}
  </div>
</div>

<style lang="scss">
  @mixin marquee-animation($direction) {
    @keyframes marquee-#{$direction} {
      @if $direction == rtl {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(-100%);
        }
      } @else if $direction == ltr {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(100%);
        }
      } @else if $direction == ttb {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(100%);
        }
      } @else if $direction == btt {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(-100%);
        }
      }
    }
  }

  @include marquee-animation(rtl);
  @include marquee-animation(ltr);
  @include marquee-animation(ttb);
  @include marquee-animation(btt);

  .marquee-wrapper {
    overflow: hidden;
    white-space: nowrap;
  }

  %marquee-base {
    display: inline-block;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    animation-fill-mode: forwards;
  }

  .marquee {
    &-rtl {
      @extend %marquee-base;
      animation-name: marquee-rtl;
    }

    &-ltr {
      @extend %marquee-base;
      animation-name: marquee-ltr;
    }

    &-ttb,
    &-btt {
      @extend %marquee-base;
      writing-mode: vertical-rl;
    }

    &-btt {
      animation-name: marquee-btt;
    }

    &-ttb {
      animation-name: marquee-ttb;
    }
  }
</style>
