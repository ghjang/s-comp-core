import { as } from "../common/util/util.js";

export function getFirstNodeId(rootUlElem: HTMLUListElement): string | null {
  let firstNodeId: string | null = null;

  const firstNodeElem = as<HTMLElement>(
    rootUlElem.querySelector(".node-content[data-node-id]")
  );
  if (firstNodeElem) {
    firstNodeId = firstNodeElem.dataset.nodeId || null;
  }

  return firstNodeId;
}

export function getLastNodeId(rootUlElem: HTMLUListElement): string | null {
  let lastNodeId: string | null = null;

  const nodeElems = rootUlElem.querySelectorAll(
    ".node-content[data-node-id]:last-child"
  );
  if (nodeElems.length > 0) {
    const lastNodeElem = as<HTMLElement>(nodeElems[nodeElems.length - 1]);
    lastNodeId = lastNodeElem?.dataset.nodeId || null;
  }

  return lastNodeId;
}

export function getPrevNodeId(
  rootUlElem: HTMLUListElement,
  nodeId: string
): string | null {
  let prevNodeId: string | null = null;

  const curNodeElem = as<HTMLElement>(
    rootUlElem.querySelector(`div.node-content[data-node-id="${nodeId}"]`)
  );
  if (!curNodeElem) return null;

  const parentLi = as<HTMLLIElement>(curNodeElem.closest("li.node-item"));
  if (!parentLi) return null;

  const prevLi = as<HTMLLIElement>(parentLi.previousElementSibling);
  if (prevLi) {
    const prevNodeElem = as<HTMLElement>(
      prevLi.querySelector(".node-content[data-node-id]")
    );
    if (prevNodeElem) {
      prevNodeId = prevNodeElem.dataset.nodeId || null;
      if (prevNodeElem.dataset.nodeOpen === "true") {
        const childUl = as<HTMLUListElement>(
          prevLi.querySelector("ul[data-node-level]")
        );
        if (childUl) {
          let nodes = childUl.querySelectorAll(".node-content[data-node-id]");
          if (nodes.length > 0) {
            const lastNode = nodes[nodes.length - 1] as HTMLElement;
            prevNodeId = lastNode.dataset.nodeId || null;
          }
        }
      }
    }
  } else {
    const parentNode = as<HTMLElement>(parentLi.parentNode);
    const prevNodeItem = as<HTMLLIElement>(parentNode?.closest("li.node-item"));
    if (prevNodeItem) {
      const prevNodeContent = prevNodeItem.querySelector(
        ".node-content[data-node-id]"
      ) as HTMLElement | null;
      prevNodeId = prevNodeContent?.dataset.nodeId || null;
    }
  }

  return prevNodeId;
}

export function getNextNodeId(
  rootUlElem: HTMLUListElement,
  nodeId: string
): string | null {
  let nextNodeId: string | null = null;

  const curNodeElem = as<HTMLElement>(
    rootUlElem.querySelector(`div.node-content[data-node-id="${nodeId}"]`)
  );
  if (!curNodeElem) return null;

  const isNodeOpen = curNodeElem.dataset.nodeOpen === "true";
  const parentLi = as<HTMLLIElement>(curNodeElem.closest("li.node-item"));
  if (!parentLi) return null;

  if (isNodeOpen) {
    const childUl = as<HTMLUListElement>(
      parentLi.querySelector("ul[data-node-level]")
    );
    if (childUl) {
      const firstChildNode = as<HTMLElement>(
        childUl.querySelector(".node-content[data-node-id]")
      );
      nextNodeId = firstChildNode?.dataset.nodeId || null;
    }
  }

  if (!nextNodeId) {
    const nextLi = as<HTMLLIElement>(parentLi.nextElementSibling);
    if (nextLi) {
      const nextNodeContent = nextLi.querySelector(
        ".node-content[data-node-id]"
      ) as HTMLElement | null;
      nextNodeId = nextNodeContent?.dataset.nodeId || null;
    }
  }

  if (!nextNodeId) {
    const parentUl = as<HTMLUListElement>(
      parentLi.closest("ul[data-node-level]")
    );
    if (parentUl) {
      const parentNode = as<HTMLElement>(parentUl.parentNode);
      const nextLi = as<HTMLLIElement>(parentNode?.nextElementSibling);
      if (nextLi) {
        const nextNodeContent = nextLi.querySelector(
          ".node-content[data-node-id]"
        ) as HTMLElement | null;
        nextNodeId = nextNodeContent?.dataset.nodeId || null;
      }
    }
  }

  return nextNodeId;
}
