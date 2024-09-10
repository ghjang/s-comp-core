import type { Action } from "svelte/action";

type DragDirection = "horizontal" | "vertical";

interface DragGripParams {
  direction: DragDirection;
  panel_0: HTMLElement;
  panel_1: HTMLElement;
  panelSizeUpdater: (newSize: string) => void;
  showPanelResizingInfo: boolean;
  hidePanel?: boolean;
}

export const dragGrip: Action<HTMLElement, DragGripParams> = (
  node: HTMLElement,
  initialParams: DragGripParams
) => {
  let params: DragGripParams = initialParams;

  let isPointerDown: boolean = false;
  let isDragging: boolean = false;
  let startX: number, startY: number, startWidth: number, startHeight: number;

  let panel_0_display: string = "";
  let panel_1_display: string = "";

  function handlePointerDown(event: PointerEvent) {
    event.preventDefault(); // '드래깅' 중에 '텍스트'와 같은 선택 가능한 것들이 선택되는 것을 방지
    event.stopPropagation();

    const layerDiv = document.createElement("div");
    layerDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      z-index: 9999;
    `;
    layerDiv.className = "top-level-layer-for-pointer-event-capture";
    layerDiv.addEventListener("pointermove", handlePointerMove);
    layerDiv.addEventListener("pointerup", handlePointerUp);
    layerDiv.addEventListener("pointercancel", handlePointerUp);
    node.appendChild(layerDiv);

    if (params.showPanelResizingInfo) {
      addPanelBorder(params.panel_0);
      addPanelBorder(params.panel_1);
    }

    let newSize: number;
    if (params.direction === "horizontal") {
      startX = event.clientX;
      startWidth = params.panel_0.offsetWidth;
      newSize = startWidth;
    } else {
      startY = event.clientY;
      startHeight = params.panel_0.offsetHeight;
      newSize = startHeight;
    }
    params.panelSizeUpdater(`${newSize}px`);

    // '드래깅' 중에 패널 컨텐트 숨김
    if (params.hidePanel) {
      if (params.panel_0.firstElementChild) {
        const panel_0_child = params.panel_0.firstElementChild as HTMLElement;
        panel_0_display = panel_0_child.style.display;
        panel_0_child.style.display = "none";
      }
      if (params.panel_1.firstElementChild) {
        const panel_1_child = params.panel_1.firstElementChild as HTMLElement;
        panel_1_display = panel_1_child.style.display;
        panel_1_child.style.display = "none";
      }
    }

    isPointerDown = true;
    isDragging = false;
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isPointerDown) {
      return;
    }

    if (!isDragging) {
      const diffX = event.clientX - startX;
      const diffY = event.clientY - startY;
      if (Math.abs(diffX) === 0 && Math.abs(diffY) === 0) {
        return;
      }
      isDragging = true;
    }

    event.stopPropagation();

    if (params.showPanelResizingInfo) {
      updatePanelSizeInfo(params.panel_0);
      updatePanelSizeInfo(params.panel_1);
    }

    const delta =
      params.direction === "horizontal"
        ? event.clientX - startX
        : event.clientY - startY;
    const newSize = `${
      (params.direction === "horizontal" ? startWidth : startHeight) + delta
    }px`;
    params.panelSizeUpdater(newSize);
  }

  function handlePointerUp(event: PointerEvent) {
    event.stopPropagation();

    const layerDiv = node.querySelector(
      ".top-level-layer-for-pointer-event-capture"
    ) as HTMLDivElement;
    if (layerDiv) {
      layerDiv.removeEventListener("pointermove", handlePointerMove);
      layerDiv.removeEventListener("pointerup", handlePointerUp);
      layerDiv.removeEventListener("pointercancel", handlePointerUp);
      layerDiv.remove();
    }

    if (params.showPanelResizingInfo) {
      removePanelBorder(params.panel_0);
      removePanelBorder(params.panel_1);
    }

    if (isPointerDown) {
      if (isDragging) {
        const delta =
          params.direction === "horizontal"
            ? event.clientX - startX
            : event.clientY - startY;
        const newSize = `${
          (params.direction === "horizontal" ? startWidth : startHeight) + delta
        }px`;
        params.panelSizeUpdater(newSize);
      }

      // 숨겼던 패널 컨텐트 복원
      if (params.hidePanel) {
        // NOTE: '모나코 에디터'와 같이 자체로 크기를 조절하려 시도하는 요소가 포함되어 있을 경우에
        //       곧바로 패널 컨텐트를 복원하면 크기 조절이 제대로 이루어지지 않는 문제를 workaround함.
        //
        //       자식 컴포넌트에 'min-content, max-content'와 같은 크기 조절이 필요한 CSS 속성이
        //       설정되어 있는 경우에 패널 크기 조절이 제대로 안될 수도 있다.
        setTimeout(() => {
          if (params.panel_0.firstElementChild) {
            const panel_0_child = params.panel_0
              .firstElementChild as HTMLElement;
            panel_0_child.style.display = panel_0_display ?? "";
            panel_0_display = "";
          }
          if (params.panel_1.firstElementChild) {
            const panel_1_child = params.panel_1
              .firstElementChild as HTMLElement;
            panel_1_child.style.display = panel_1_display ?? "";
            panel_1_display = "";
          }
        }, 250);
      }
    }

    isPointerDown = false;
    isDragging = false;
  }

  function addPanelBorder(panel: HTMLElement) {
    const originalPosition = getComputedStyle(panel).position;
    if (originalPosition === "static") {
      panel.style.setProperty("--original-position", "static");
      panel.style.position = "relative";
    } else {
      panel.style.setProperty("--original-position", originalPosition);
    }
    panel.style.setProperty("--panel-border-color", "lightcoral");
    panel.style.setProperty("--panel-border-width", "3px");
    panel.style.setProperty("--panel-border-style", "solid");
    updatePanelSizeInfo(panel);
    panel.classList.add("s-comp-splitter-panel-with-border");
  }

  function updatePanelSizeInfo(panel: HTMLElement) {
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    panel.style.setProperty("--panel-size-content", `"${width} x ${height}"`);
  }

  function removePanelBorder(panel: HTMLElement) {
    const originalPosition = panel.style.getPropertyValue(
      "--original-position"
    );
    if (originalPosition) {
      panel.style.position = originalPosition;
    }
    panel.style.removeProperty("--panel-border-color");
    panel.style.removeProperty("--panel-border-width");
    panel.style.removeProperty("--panel-border-style");
    panel.style.removeProperty("--panel-size-content");
    panel.style.removeProperty("--original-position");
    panel.classList.remove("s-comp-splitter-panel-with-border");
  }

  node.addEventListener("pointerdown", handlePointerDown);

  return {
    update(newParams: DragGripParams) {
      params = newParams;
    },
    destroy() {
      node.removeEventListener("pointerdown", handlePointerDown);
    },
  };
};
