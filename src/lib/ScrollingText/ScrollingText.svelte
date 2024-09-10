<script>
  import { onMount } from "svelte";

  export let texts = [];
  export let backgroundImage = "";

  let perspectiveContainer;
  let perspectiveContainerHeight = "auto";
  let rotateBox;
  let textBlock;

  onMount(() => {
    perspectiveContainerHeight = `${perspectiveContainer.offsetWidth * 0.75}px`;

    const rotateBoxHeight = rotateBox.offsetHeight;
    const textBlockHeight = textBlock.offsetHeight;

    const totalDistance = rotateBoxHeight + textBlockHeight;
    const speed = 0.025; // 초/픽셀
    const duration = totalDistance * speed;

    const style = document.createElement("style");
    document.head.appendChild(style);
    style.sheet.insertRule(
      `
            @keyframes slideDownAdjusted {
            from { 
                top: 100%;
            }
            to {
                top: -${totalDistance}px;
            }
            }
        `,
      0
    );

    textBlock.style.animationName = "slideDownAdjusted";
    textBlock.style.animationDuration = `${duration}s`;
    textBlock.style.animationTimingFunction = "linear";
    textBlock.style.animationFillMode = "forwards";
  });
</script>

<div
  class="scrolling-text-container"
  style:background-image={`url(${backgroundImage})`}
>
  <div
    class="perspective-container"
    bind:this={perspectiveContainer}
    style:height={perspectiveContainerHeight}
  >
    <div class="rotate-box" bind:this={rotateBox}>
      <div class="text-block" bind:this={textBlock}>
        {#each texts as text}
          <p class="text">{text}</p>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .scrolling-text-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: black;
  }

  .perspective-container {
    width: 100%;
    perspective: 300px;
    perspective-origin: 50% 100%;
  }

  .rotate-box {
    position: relative;
    left: 15%;
    width: 70%;
    height: 80%;
    overflow: hidden;
    transform-style: preserve-3d;
    transform: rotateX(12deg);
  }

  .text-block {
    position: relative;
    margin: 2px;
  }

  .text {
    font-family: "Roboto", sans-serif;
    font-size: 3em;
    color: white;
  }
</style>
