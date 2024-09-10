import { as } from "../common/util/util.js";
import type Tree from "./Tree.svelte";

export function _handleKeyDown(
  event: KeyboardEvent,
  treeContainer: HTMLDivElement,
  tree: Tree
): void {
  const rootUlElem = as<HTMLUListElement>(
    treeContainer?.querySelector("ul[data-node-level='0']")
  );
  if (!rootUlElem) return;

  switch (event.key) {
    case "ArrowUp":
      tree?.moveSelectRectToPrevNode(rootUlElem);
      break;
    case "ArrowDown":
      tree?.moveSelectRectToNextNode(rootUlElem);
      break;
    default:
      break;
  }
}

export function _handleKeyUp(
  event: KeyboardEvent,
  treeContainer: HTMLDivElement,
  tree: Tree
): void {
  const rootUlElem = as<HTMLUListElement>(
    treeContainer?.querySelector("ul[data-node-level='0']")
  );
  if (!rootUlElem) return;

  switch (event.key) {
    case "ArrowLeft":
      tree?.closeNodeAtSelectRect(rootUlElem);
      break;
    case "ArrowRight":
      tree?.openNodeAtSelectRect(rootUlElem);
      break;
    case "Home":
      tree?.moveSelectRectToFirstNode(rootUlElem);
      break;
    case "End":
      tree?.moveSelectRectToLastNode(rootUlElem);
      break;
    case "Enter":
      tree?.selectNodeAtSelectRect(rootUlElem);
      break;
    case "Escape":
      treeContainer?.blur();
      break;
    case "Delete":
      tree?.removeNodeAtSelectRect(rootUlElem);
      break;
    default:
      break;
  }
}
