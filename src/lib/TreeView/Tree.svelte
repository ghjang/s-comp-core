<script lang="ts">
  import { getContext, setContext, createEventDispatcher } from "svelte";
  import {
    getFirstNodeId,
    getLastNodeId,
    getPrevNodeId,
    getNextNodeId,
  } from "./tree.dom.js";
  import { writable, type Writable } from "svelte/store";
  import type { TreeNode } from "../common/tree.js";
  import type { NodeStylerFunction } from "./types.js";

  type TreeEvents = {
    treeNodeSelected: TreeNode;
    treeNodeHovered: TreeNode;
    treeNodeButtonClicked: TreeNode;
    treeNodeRemove: TreeNode;
  };

  type EventName = keyof TreeEvents;

  const _dispatch = createEventDispatcher<TreeEvents>();

  const dispatch = (type: EventName, nodeData: TreeNode) => {
    $context.lastSelectRectNodeId = nodeData.id;
    _dispatch(type, nodeData);
  };

  export let nodeLevel = 0;
  export let data: TreeNode[] = [];

  export let openIcon = "▼";
  export let closeIcon = "►";

  export let showSelectRect = false;

  export let nodeStyler: NodeStylerFunction | null = null;

  export let hoverDelay = 1000; // 1초

  interface TreeContext {
    maxLevel: number;
    selectedNodeId: string | null;
    lastSelectRectNodeId: string | null;
  }

  export function updateNodeSelected(nodeId: string | null) {
    $context.selectedNodeId = nodeId;
    $context.lastSelectRectNodeId = nodeId;
  }

  export function openNodeAtSelectRect(rootUlElem: HTMLUListElement) {
    const nodeId = $context.lastSelectRectNodeId;
    const nodeBtnElem = rootUlElem.querySelector(
      `div.node-content[data-node-id="${nodeId}"] button.toggle-button`,
    ) as HTMLButtonElement | null;
    if (nodeBtnElem) {
      const contentNode = nodeBtnElem.parentNode as HTMLElement;
      const isOpen = contentNode.dataset.nodeOpen == "true";
      if (!isOpen) {
        nodeBtnElem.click();
      }
    }
  }

  export function closeNodeAtSelectRect(rootUlElem: HTMLUListElement) {
    const nodeId = $context.lastSelectRectNodeId;
    const nodeBtnElem = rootUlElem.querySelector(
      `div.node-content[data-node-id="${nodeId}"] button.toggle-button`,
    ) as HTMLButtonElement | null;
    if (nodeBtnElem) {
      const contentNode = nodeBtnElem.parentNode as HTMLElement;
      const isOpen = contentNode.dataset.nodeOpen == "true";
      if (isOpen) {
        nodeBtnElem.click();
      }
    }
  }

  export function selectNodeAtSelectRect(rootUlElem: HTMLUListElement) {
    const nodeId = $context.lastSelectRectNodeId;
    const nodeElem = rootUlElem.querySelector(
      `div.node-content[data-node-id="${nodeId}"]`,
    ) as HTMLElement | null;
    if (nodeElem) {
      const nodeNameElem = nodeElem.querySelector(".node-name") as HTMLElement;
      nodeNameElem.click();
    }
  }

  export function moveSelectRectToPrevNode(rootUlElem: HTMLUListElement) {
    const lastNodeId = $context.lastSelectRectNodeId;

    if (!lastNodeId) {
      const lastNodeId = getLastNodeId(rootUlElem);
      updateNodeSelectRect(lastNodeId);
      return;
    }

    const prevNodeId = getPrevNodeId(rootUlElem, lastNodeId);
    updateNodeSelectRect(prevNodeId);
  }

  export function moveSelectRectToNextNode(rootUlElem: HTMLUListElement) {
    const lastNodeId = $context.lastSelectRectNodeId;

    if (!lastNodeId) {
      const firstNodeId = getFirstNodeId(rootUlElem);
      updateNodeSelectRect(firstNodeId);
      return;
    }

    const nextNodeId = getNextNodeId(rootUlElem, lastNodeId);
    updateNodeSelectRect(nextNodeId);
  }

  export function moveSelectRectToFirstNode(rootUlElem: HTMLUListElement) {
    const firstNodeId = getFirstNodeId(rootUlElem);
    updateNodeSelectRect(firstNodeId);
  }

  export function moveSelectRectToLastNode(rootUlElem: HTMLUListElement) {
    const lastNodeId = getLastNodeId(rootUlElem);
    updateNodeSelectRect(lastNodeId);
  }

  export function removeNodeAtSelectRect(rootUlElem: HTMLUListElement) {
    const nodeId = $context.lastSelectRectNodeId;
    const nodeElem = rootUlElem.querySelector(
      `div.node-content[data-node-id="${nodeId}"]`,
    ) as HTMLElement | null;
    if (nodeElem) {
      const nodeLiElem = nodeElem.closest("li");
      if (nodeLiElem) {
        dispatch("treeNodeRemove", { id: nodeId } as TreeNode);
      }
    }
  }

  function updateNodeSelectRect(nodeId: string | null) {
    $context.lastSelectRectNodeId = nodeId ?? $context.lastSelectRectNodeId;
  }

  function toggleNodeOpenState(nodeData: TreeNode) {
    nodeData.open = !nodeData.open;
    data = [...data];
  }

  const contextName = "tree-context";
  const context = initContext(contextName);
  $: updateTreeViewState($context);

  function initContext(ctxName: string): Writable<TreeContext> {
    let context: Writable<TreeContext>;
    if (nodeLevel === 0) {
      context = writable({
        maxLevel: 0,
        selectedNodeId: null,
        lastSelectRectNodeId: null,
      });
      setContext(ctxName, context);
    } else {
      context = getContext(ctxName);
      context.update((value) => {
        if (nodeLevel > value.maxLevel) {
          value.maxLevel = nodeLevel;
        }
        return value;
      });
    }
    return context;
  }

  function updateTreeViewState(context: TreeContext) {
    if (nodeLevel === 0) {
      // 루트 레벨에서의 처리
    } else {
      // 하위 레벨에서의 처리
    }
  }

  let clickTimeout: number | null = null;

  function handleNodeNameClick(event: MouseEvent, nodeData: TreeNode) {
    if (!event.isTrusted) {
      dispatch("treeNodeSelected", nodeData);
      return;
    }

    clearTimeout(clickTimeout!);
    clickTimeout = window.setTimeout(() => {
      clickTimeout = null;
      dispatch("treeNodeSelected", nodeData);
    }, 250);
  }

  function handleNodeNameDbClick(event: MouseEvent, nodeData: TreeNode) {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      dispatch("treeNodeSelected", nodeData);
    }
    toggleNodeOpenState(nodeData);
  }

  function applyNodeStyler(
    htmlDomNode: HTMLElement,
    params: {
      nodeStyler: typeof nodeStyler;
      treeNodeData: TreeNode;
      nodeOpen: boolean;
    },
  ) {
    let { nodeStyler, treeNodeData, nodeOpen } = params;

    nodeStyler?.(htmlDomNode, { treeNodeData, nodeOpen });

    return {
      update(newParams: typeof params) {
        ({ nodeStyler, treeNodeData, nodeOpen } = newParams);
      },
    };
  }

  let hoverTimer: number | null = null;

  function handleNodeMouseEnter(node: TreeNode) {
    hoverTimer = window.setTimeout(
      () => dispatch("treeNodeHovered", node),
      hoverDelay,
    );
  }

  function handleNodeMouseLeave() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }
</script>

<ul data-node-level={nodeLevel}>
  {#each data as node (node.id)}
    <li class="node-item" title={node.tooltip ?? ""}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="node-content"
        class:select-rect={node.id == $context.lastSelectRectNodeId &&
          showSelectRect}
        data-node-id={node.id}
        data-node-open={node.open}
        on:click={() => dispatch("treeNodeSelected", node)}
      >
        <button
          class="toggle-button"
          tabindex="-1"
          on:mousedown|preventDefault
          on:click|preventDefault|stopPropagation={() => {
            toggleNodeOpenState(node);
            updateNodeSelectRect(node.id);
            dispatch("treeNodeButtonClicked", node);
          }}
        >
          {#if node.children && node.children.length > 0}
            {node.open ? openIcon : closeIcon}
          {:else}
            <span class="dummy-toggle-button-span"></span>
          {/if}
        </button>

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
          class="node-name"
          class:selected={node.id == $context.selectedNodeId}
          on:click|preventDefault|stopPropagation={(e) =>
            handleNodeNameClick(e, node)}
          on:dblclick|preventDefault|stopPropagation={(e) =>
            handleNodeNameDbClick(e, node)}
          on:mouseenter={() => handleNodeMouseEnter(node)}
          on:mouseleave={handleNodeMouseLeave}
        >
          {#if node.open}
            <span
              use:applyNodeStyler={{
                nodeStyler,
                treeNodeData: node,
                nodeOpen: true,
              }}
            >
              {node.name}
            </span>
          {:else}
            <span
              use:applyNodeStyler={{
                nodeStyler,
                treeNodeData: node,
                nodeOpen: false,
              }}
            >
              {node.name}
            </span>
          {/if}
        </span>
      </div>

      {#if node.children && node.open}
        <svelte:self
          nodeLevel={nodeLevel + 1}
          data={node.children}
          {openIcon}
          {closeIcon}
          {showSelectRect}
          {nodeStyler}
          {hoverDelay}
          on:treeNodeHovered
          on:treeNodeSelected
          on:treeNodeButtonClicked
        />
      {/if}
    </li>
  {/each}

  <!-- NOTE: 'ul ul' CSS 셀렉터가 코드 상에 명시적으로 보이지 않아서 번들링시에 해당 CSS가 제거되는 문제 workaround -->
  <li class="dummy" style:display="none">
    <ul></ul>
  </li>
</ul>

<style lang="scss">
  ul {
    list-style-type: none;
    padding: 0;
    margin: 0;

    .node-item {
      margin-top: 0.2em;
      user-select: none;

      .node-content {
        margin-left: 2px;
        margin-right: 2px;

        &.select-rect {
          outline: none;
          box-shadow: 0 0 0 1px darkgray;
        }

        .toggle-button {
          border: none;
          background: none;
          box-shadow: none;
          color: inherit;
          padding: 0;
          user-select: none;
          outline: none;
          cursor: pointer;

          .dummy-toggle-button-span {
            display: inline-block;
            width: 1em;
          }
        }

        .node-name {
          margin: 0;
          padding-left: 0.2em;
          padding-right: 0.2em;
          border-radius: 0.05em;

          &.selected {
            background-color: darkgray;
          }
        }
      }
    }
  }

  ul {
    ul {
      margin-left: 1em;
    }
  }
</style>
