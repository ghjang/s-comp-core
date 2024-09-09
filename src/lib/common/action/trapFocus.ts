import { as } from "../util";

interface TrapFocusAction {
  destroy(): void;
}

interface ConditionalTrapFocusOptions {
  predicate: (() => boolean) | boolean;
}

export function trapFocus(node: HTMLElement): TrapFocusAction {
  const previous = as<HTMLElement>(document.activeElement);

  function focusable(): HTMLElement[] {
    return Array.from(
      node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;

    // NOTE: '포커스'를 실제 가진 요소가 'Shadow DOM' 하위에 있을 경우에
    //       'document.activeElement'는 'Shadow DOM 호스트' 요소를 반환한다.
    let current = as<HTMLElement>(document.activeElement);

    // NOTE: 'Shadow DOM' 호스트 요소일 경우 'Shadow DOM' 내부의 '포커스'를 실제 가진 요소를 찾는다.
    //       'Shadow DOM'이 '중첩'되어 있을 경우에도 정상적으로 처리된다.
    while (current?.shadowRoot?.activeElement) {
      current = as<HTMLElement>(current.shadowRoot.activeElement);
    }

    const elements = focusable();
    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && current === first) {
      last.focus();
      event.preventDefault();
    }

    if (!event.shiftKey && current === last) {
      first.focus();
      event.preventDefault();
    }
  }

  focusable()[0]?.focus();

  node.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      node.removeEventListener("keydown", handleKeydown);
      previous?.focus();
    },
  };
}

export function conditionalTrapFocus(
  node: HTMLElement,
  { predicate }: ConditionalTrapFocusOptions
): TrapFocusAction | undefined {
  let shouldTrapFocus: boolean;

  if (typeof predicate === "function") {
    shouldTrapFocus = predicate();
  } else {
    shouldTrapFocus = predicate;
  }

  if (shouldTrapFocus) {
    return trapFocus(node);
  }
}
