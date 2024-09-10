<script>
  export let totalPageCount;
  export let page;
  export let pageRegion;

  let pageNumber;
  let frontPage;
  let backPage;

  $: pageNumber = page.no + 1;

  $: frontPage =
    (pageRegion === "right" && page.no % 2 === 0) ||
    (pageRegion === "left" && page.no % 2 === 1);

  $: backPage =
    (pageRegion === "right" && page.no % 2 === 1) ||
    (pageRegion === "left" && page.no % 2 === 0);
</script>

<div class="pageContent {pageRegion}" class:frontPage class:backPage>
  {#if page.content.indexOf("<img") != -1}
    {@html page.content}
  {:else}
    {page.content}
  {/if}

  {#if pageNumber !== 1 && pageNumber !== totalPageCount}
    <div class="pageNumber">{pageNumber}</div>
  {/if}
</div>

<style lang="scss">
  .pageContent {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: calc(95% - 1em);
    height: calc(95% - 1em);
    padding: 1em;
    border-radius: 0.1em;
    background-color: lightcoral;
    font-size: 1.5em;
    overflow: hidden;
    backface-visibility: hidden;

    &.left {
      right: 0;
      border-right: 1.5px solid rgb(62, 53, 53);
      box-shadow:
        -5px 0 5px rgba(0, 0, 0, 0.25),
        0 5px 5px rgba(0, 0, 0, 0.15),
        0 -5px 5px rgba(0, 0, 0, 0.15);

      &.backPage {
        transform: translateY(-50%) rotateY(180deg);
      }

      .pageNumber {
        position: absolute;
        bottom: 1em;
        left: 1em;
        font-size: 0.5em;
      }
    }

    &.right {
      left: 0;
      border-left: 1.5px solid rgb(62, 53, 53);
      box-shadow:
        5px 0 5px rgba(0, 0, 0, 0.25),
        0 5px 5px rgba(0, 0, 0, 0.15),
        0 -5px 5px rgba(0, 0, 0, 0.15);

      &.backPage {
        transform: translateY(-50%) rotateY(180deg);
      }

      .pageNumber {
        position: absolute;
        bottom: 1em;
        right: 1em;
        font-size: 0.5em;
      }
    }
  }
</style>
