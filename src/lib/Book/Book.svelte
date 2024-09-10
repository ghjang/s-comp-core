<script>
  import { setContext, onDestroy } from "svelte";
  import { createContext, setAnimationConfig } from "./book.js";
  import PageContent from "./PageContent.svelte";

  // '페이지 컨텐츠' 원본 목록
  export let pages = [];

  // '페이지 플리핑' 애메이션 관련 속성들
  //
  // NOTE: '사파리, 파이어 폭스' 브라우저에서 '180도 회전 애니메이션' '1번'에 통으로 진행할 경우에
  //       '90도 회전'까지는 정상이지만, '90도 이상' 회전할 때 '클립핑'이 발생하여 내용이 표시되지 않는 문제가 있다.
  //       '크롬'에서는 이러한 문제가 발생하지 않는다.
  //
  //       이 문제를 해결하기 위해서 '페이지 플리핑' 애니메이션을 '2번'으로 나누어서 진행하고 있다.
  //       이때 페이지 플리핑 애니메이션의 '속도'가 자연스럽게 하기 위해서 각 단계별로 타이밍 함수를 다르게 설정했다.
  export let animationDuration = "0.6s";
  export let animationTimingFunctionFirst = "linear";
  export let animationTimingFunctionLast = "cubic-bezier(0.55, 0.085, 0.68, 0.53)";

  const ctx = createContext();
  onDestroy(() => ctx.destroy());
  setContext("context", ctx);
  $: ctx.pages.set(pages);

  // NOTE: 현재와 같이 'div 2개로 1장의 앞/뒤 면을 표현'하는 방식에서
  //       '페이지 플리핑' 애니메이션을 적용하려면 해당 div 2개를 포함하는
  //       '컨테이너 div'를 추가하고 이 컨테이너 div에 애니메이션을 적용해야 한다.
  //       '스벨트'에서 '페이지 2개'당 컨테이너 div를 'each'로 생성하는 것이
  //       'pages'만을 이용해서는 어렵기 때문에 '페이지 2개'씩 묶은 '페이지 쌍'을
  //       추가로 생성하고 이 '페이지 쌍'을 이용해서 '컨테이너 div'를 생성한다.
  const leftPagePairs = ctx.leftPagePairs;
  const rightPagePairs = ctx.rightPagePairs;

  const totalPageCount = ctx.totalPageCount;
  const targetTopPageNo = ctx.animationTargetTopPageNo;

  const firstHalf = ctx.animationFirstHalf;
  const lastHalf = ctx.animationLastHalf;

  // NOTE: '페이지 플리핑' 애니메이션을 '트리거' 하기 위해서
  //       아래와 같이 'flipPageToRight, flipPageToLeft' CSS 클래스를
  //       '반응형'으로 설정하는 방법을 취하고 있다.
  //
  //       원래는 'use:setAnimationConfig' 액션 코드에서 해당 CSS 클래스를
  //       '자바스크립트'에서 설정하려 했으나 '.svelte'가 빌드되는 과정에서
  //       해당 'CSS 클래스 명'에 '해시값'이 붙어서 출력되어 '자바스크립트' 코드 상에서
  //       해당 'CSS 클래스'를 찾을 수 없고 결국 '애니메이션'이 시작되지 않는 문제가 있었다.
</script>

<div class="book">
  <div class="leftPageRegion">
    {#each $leftPagePairs as pair}
      <div
        class="pageContainer"
        class:flipPageToRight={pair[1].no === $targetTopPageNo}
        class:firstHalf={$firstHalf}
        class:lastHalf={$lastHalf}
        use:setAnimationConfig={{
          ctx,
          pagePair: pair,
          direction: "ltr",
          animationDuration,
          animationTimingFunctionFirst,
          animationTimingFunctionLast
        }}
      >
        {#each pair as page (page.no)}
          <PageContent
            totalPageCount={$totalPageCount}
            {page}
            pageRegion="left"
          />
        {/each}
      </div>
    {/each}
  </div>
  <div class="rightPageRegion">
    {#each $rightPagePairs as pair}
      <div
        class="pageContainer"
        class:flipPageToLeft={pair[1].no === $targetTopPageNo}
        class:firstHalf={$firstHalf}
        class:lastHalf={$lastHalf}
        use:setAnimationConfig={{
          ctx,
          pagePair: pair,
          direction: "rtl",
          animationDuration,
          animationTimingFunctionFirst,
          animationTimingFunctionLast
        }}
      >
        {#each pair as page (page.no)}
          <PageContent
            totalPageCount={$totalPageCount}
            {page}
            pageRegion="right"
          />
        {/each}
      </div>
    {/each}
  </div>
</div>
<div class="navigation-button">
  <button on:click={() => ctx.setFlipPageToRightAnimation()}>&lt;</button>
  <button on:click={() => ctx.setFlipPageToLeftAnimation()}>&gt;</button>
</div>

<style lang="scss">
  .book {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: stretch;
    height: calc(100% - 2em);
    transform: translate3d(0, 0, 0); /* NOTE: 'GPU 가속' 유도를 위한 설정 */
    transform-style: preserve-3d; /* NOTE: '3D 변환' 효과 보존 */
    perspective: 1000px; /* NOTE: '3D 변환' 효과 강도 */
  }

  .leftPageRegion,
  .rightPageRegion {
    position: relative;
    flex: 1;
    margin: 0;
    padding: 0;
  }

  .leftPageRegion {
    border-top: 1px solid black;
    border-right: none;
    border-bottom: 1px solid black;
    border-left: 1px solid black;
  }

  .rightPageRegion {
    border-top: 1px solid black;
    border-right: 1px solid black;
    border-bottom: 1px solid black;
    border-left: none;
  }

  .pageContainer {
    position: absolute;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: none;

    &.flipPageToLeft {
      z-index: 9999;
      transform-origin: left;
      will-change: transform;

      &.firstHalf {
        animation-name: flipPagePairFirstHalf;
      }

      &.lastHalf {
        animation-name: flipPagePairLastHalf;
      }
    }

    &.flipPageToRight {
      z-index: 9999;
      transform-origin: right;
      will-change: transform;

      &.firstHalf {
        animation-name: flipPagePairFirstHalf;
      }

      &.lastHalf {
        animation-name: flipPagePairLastHalf;
      }
    }
  }

  .navigation-button {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  @keyframes flipPagePairFirstHalf {
    from {
      transform: rotateY(0deg);
    }
    to {
      transform: rotateY(-90deg);
    }
  }

  @keyframes flipPagePairLastHalf {
    from {
      transform: rotateY(-90deg);
    }
    to {
      transform: rotateY(0deg);
    }
  }
</style>
