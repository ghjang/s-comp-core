// '마우스'나 '트랙패드'로 HTML 노드의 '경계' 부분에서 스크롤을 시도할 때 기본적으로 부모 노드
// 영역까지 스크롤을 시도하는 '기본 동작'을 막아주는 '스벨트 액션'이다.
export function preventOverscroll(node: HTMLElement) {
  function handleWheel(event: WheelEvent) {
    // 스크롤 방향이 아래이고 스크롤이 맨 아래에 도달한 경우
    const isScrollingDownAtBottom =
      event.deltaY > 0 &&
      Math.ceil(node.scrollTop) + node.clientHeight >= node.scrollHeight;

    // 스크롤 방향이 위이고 스크롤이 맨 위에 도달한 경우
    const isScrollingUpAtTop = event.deltaY < 0 && node.scrollTop === 0;

    // 스크롤 방향이 오른쪽이고 스크롤이 맨 오른쪽에 도달한 경우
    const isScrollingRightAtEnd =
      event.deltaX > 0 &&
      Math.ceil(node.scrollLeft) + node.clientWidth >= node.scrollWidth;

    // 스크롤 방향이 왼쪽이고 스크롤이 맨 왼쪽에 도달한 경우
    const isScrollingLeftAtStart = event.deltaX < 0 && node.scrollLeft === 0;

    if (
      isScrollingDownAtBottom ||
      isScrollingUpAtTop ||
      isScrollingRightAtEnd ||
      isScrollingLeftAtStart
    ) {
      event.preventDefault();
    }
  }

  node.addEventListener("wheel", handleWheel);

  return {
    destroy() {
      node.removeEventListener("wheel", handleWheel);
    },
  };
}
