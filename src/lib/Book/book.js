import { writable, derived, get } from "svelte/store";

export function createContext() {
  const _pages = writable([]);

  // '1장'이 항상 '앞/뒤' 2개 면을 가지도록 'pages'를 가공
  const _alignedPages = derived(_pages, ($pages) => {
    return $pages.length % 2 !== 0 ? [...$pages, ""] : $pages;
  });

  const totalPageCount = derived(_alignedPages, ($alignedPages) => {
    return $alignedPages.length;
  });

  // 'pages'로부터 가공된 내부 구현용 페이지 컨텐츠 목록
  const _leftPages = writable([]);
  const _rightPages = writable([]);

  const unsubscribe = _alignedPages.subscribe(($alignedPages) => {
    _leftPages.set([]);
    _rightPages.set(
      $alignedPages
        .map((page, index) => ({ no: index, content: page }))
        .reverse()
    );
  });

  const leftPagePairs = derived(_leftPages, ($leftPages) => {
    let pairs = [];
    for (let i = 0; i < $leftPages.length; i += 2) {
      pairs.push($leftPages.slice(i, i + 2));
    }
    return pairs;
  });

  const rightPagePairs = derived(_rightPages, ($rightPages) => {
    let pairs = [];
    for (let i = 0; i < $rightPages.length; i += 2) {
      pairs.push($rightPages.slice(i, i + 2));
    }
    return pairs;
  });

  const animationTargetTopPageNo = writable(-1);

  const animationFirstHalf = writable(false);
  const animationLastHalf = derived(
    animationFirstHalf,
    ($firstHalf) => !$firstHalf
  );

  return {
    pages: _pages,
    _alignedPages,
    totalPageCount,

    _leftPages,
    _rightPages,
    leftPagePairs,
    rightPagePairs,

    animationTargetTopPageNo,
    animationFirstHalf,
    animationLastHalf,

    destroy: () => {
      unsubscribe();
    },

    setFlipPageToLeftAnimation: (firstHalf = true) => {
      if (firstHalf) {
        const rightPages = get(_rightPages);
        const curRightTopPageNo =
          rightPages.length > 0 ? rightPages[rightPages.length - 1].no : -1;
        animationTargetTopPageNo.set(curRightTopPageNo);
        animationFirstHalf.set(true);
      } else {
        const leftPages = get(_leftPages);
        const curLeftTopPageNo =
          leftPages.length > 0 ? leftPages[leftPages.length - 1].no : -1;
        animationTargetTopPageNo.set(curLeftTopPageNo);
        animationFirstHalf.set(false);
      }
    },

    setFlipPageToRightAnimation: (firstHalf = true) => {
      if (firstHalf) {
        const leftPages = get(_leftPages);
        const curLeftTopPageNo =
          leftPages.length > 0 ? leftPages[leftPages.length - 1].no : -1;
        animationTargetTopPageNo.set(curLeftTopPageNo);
        animationFirstHalf.set(true);
      } else {
        const rightPages = get(_rightPages);
        const curRightTopPageNo =
          rightPages.length > 0 ? rightPages[rightPages.length - 1].no : -1;
        animationTargetTopPageNo.set(curRightTopPageNo);
        animationFirstHalf.set(false);
      }
    },
  };
}

export function setAnimationConfig(pageContainerElem, params) {
  const { ctx, pagePair, direction } = params;

  pageContainerElem.style.animationDuration = params.animationDuration;
  pageContainerElem.style.animationTimingFunction =
    params.animationTimingFunctionFirst;

  const unsubscribe = ctx.animationTargetTopPageNo.subscribe(
    ($targetTopPageNo) => {
      if ($targetTopPageNo !== pagePair[1].no) {
        return;
      }

      pageContainerElem.addEventListener(
        "animationend",
        () => {
          if (get(ctx.animationLastHalf)) {
            ctx.animationTargetTopPageNo.set(-1);
            pageContainerElem.style.animationTimingFunction =
              params.animationTimingFunctionFirst;
            return;
          }

          const leftPages = get(ctx._leftPages);
          const rightPages = get(ctx._rightPages);

          if (direction === "rtl") {
            const frontPage = rightPages.pop();
            const backPage = rightPages.pop();
            ctx._leftPages.set([...leftPages, frontPage, backPage]);
            ctx._rightPages.set([...rightPages]);
            if (get(ctx.animationFirstHalf)) {
              pageContainerElem.style.animationTimingFunction =
                params.animationTimingFunctionLast;
              ctx.setFlipPageToLeftAnimation(false);
            }
          } else if (direction === "ltr") {
            const backPage = leftPages.pop();
            const frontPage = leftPages.pop();
            ctx._leftPages.set([...leftPages]);
            ctx._rightPages.set([...rightPages, backPage, frontPage]);
            ctx.animationTargetTopPageNo.set(-1);
            if (get(ctx.animationFirstHalf)) {
              pageContainerElem.style.animationTimingFunction =
                params.animationTimingFunctionLast;
              ctx.setFlipPageToRightAnimation(false);
            }
          } else {
            throw new Error(`Invalid direction: ${direction}`);
          }
        },
        { once: true }
      );
    }
  );

  return {
    destroy() {
      unsubscribe();
    },
  };
}
