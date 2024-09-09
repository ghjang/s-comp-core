// 'element'로부터 가장 가까운 'className'을 가진 엘리먼트를 찾아 반환한다.
// 'Shadow DOM'내에 element가 있을 경우에 'Shadow DOM' 위로 올라가서 찾는다.
// 참고로 'closest' 메소드는 'Shadow DOM'을 벗어나지 않는다.
export function findClosest(
  element: Element | null,
  className: string
): Element | null {
  if (!element) return null;
  if (element.classList && element.classList.contains(className)) {
    return element;
  }
  if (element.parentElement) {
    return findClosest(element.parentElement, className);
  }
  const root = element.getRootNode?.();
  const host = root && (root as ShadowRoot).host;
  if (host) {
    return findClosest(host, className);
  }
  return null;
}

export function findClosestAncestor(
  element: Element,
  className: string
): Element | null {
  let parent: Element | null = element.parentElement;
  if (!parent) {
    const root = element.getRootNode?.();
    parent = (root && (root as ShadowRoot).host) || null;
  }
  if (!parent) {
    return null;
  }
  return findClosest(parent, className);
}
