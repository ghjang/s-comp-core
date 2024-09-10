import type { TreeNode } from "../common/tree.js";

export type NodeStylerFunction = (
  node: HTMLElement,
  params: { treeNodeData: TreeNode; nodeOpen: boolean }
) => void;