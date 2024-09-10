<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Tree from "./Tree.svelte";
  import { _handleKeyDown, _handleKeyUp } from "./treeview.key.js";
  import type { TreeNode } from "../common/tree.js";
  import type { NodeStylerFunction } from "./types.js";

  // TODO: '트리 노드 텍스트 필털깅 박스' 기능 추가

  export let data: TreeNode[] = [];

  export let openIcon = "▼";
  export let closeIcon = "►";

  export let nodeStyler: NodeStylerFunction | null = null;

  export let hoverDelay = 1000; // 1초

  export const customEvents = ["treeNodeSelected", "treeNodeRemove"];

  let treeContainer: HTMLDivElement;
  let tree: Tree;
  let showSelectRect = false;

  const dispatch = createEventDispatcher<{
    treeNodeSelected: { id: string };
    treeNodeRemove: { id: string };
  }>();

  const handleKeyDown = (event: KeyboardEvent) =>
    _handleKeyDown(event, treeContainer, tree);
  const handleKeyUp = (event: KeyboardEvent) =>
    _handleKeyUp(event, treeContainer, tree);

  // '노드명'이나 노드며 우측의 '빈 공간'을 클릭했을 때 처리
  function handleTreeNodeSelected(event: CustomEvent<{ id: string }>) {
    const nodeId = event.detail.id;
    tree.updateNodeSelected(nodeId);

    treeContainer.focus();

    dispatch("treeNodeSelected", event.detail);
  }

  function handleTreeNodeRemove(event: CustomEvent<{ id: string }>) {
    tree.updateNodeSelected(null);
    dispatch("treeNodeRemove", event.detail);
  }

  // '노드명' 좌측의 '버튼'을 클릭했을 때 처리
  function handleTreeNodeButtonClicked() {
    treeContainer.focus();
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={treeContainer}
  class="tree-container"
  tabindex="-1"
  on:keydown={handleKeyDown}
  on:keyup={handleKeyUp}
  on:focusin={() => (showSelectRect = true)}
  on:focusout={() => (showSelectRect = false)}
  on:click={() => treeContainer?.focus()}
>
  <Tree
    bind:this={tree}
    {data}
    {openIcon}
    {closeIcon}
    {showSelectRect}
    {nodeStyler}
    {hoverDelay}
    on:treeNodeHovered
    on:treeNodeSelected={handleTreeNodeSelected}
    on:treeNodeRemove={handleTreeNodeRemove}
    on:treeNodeButtonClicked={handleTreeNodeButtonClicked}
  />
</div>

<style>
  .tree-container {
    margin: 0;
    padding: 0 0 1px 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    outline: none;
  }
</style>
