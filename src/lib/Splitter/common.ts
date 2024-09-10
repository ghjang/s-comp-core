export type ShowContentControlOptions = {
  panelSwapButton?: boolean;
  toggleOrientationButton?: boolean;
};

export type PanelSizeInfo = {
  container: DOMRect;
  panel_0: DOMRect;
  panel_1: DOMRect | null | undefined;
};

function isShowContentControlObject(
  value: boolean | ShowContentControlOptions
): value is ShowContentControlOptions {
  return typeof value === "object";
}

export function shouldShowPanelSwapButton(
  showContentControl: boolean | ShowContentControlOptions
): boolean {
  return (
    showContentControl === true ||
    (isShowContentControlObject(showContentControl) &&
      showContentControl.panelSwapButton !== false)
  );
}

export function shouldShowToggleOrientationButton(
  showContentControl: boolean | ShowContentControlOptions
): boolean {
  return (
    showContentControl === true ||
    (isShowContentControlObject(showContentControl) &&
      showContentControl.toggleOrientationButton !== false)
  );
}
