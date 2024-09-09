export type TreeNode<T = unknown> = {
  id: string;
  name: string | null | undefined;
  tooltip?: string;
  open?: boolean;
  children?: TreeNode<T>[];
  data?: T;
};

export type TraverseCallback<T = any> = (
  node: TreeNode<T>,
  nodes: TreeNode<T>[],
  nodeIndex: {
    get: () => number;
    set: (i: number) => void;
  },
  level: number
) => boolean | void | undefined;

export function createTreeNode<T>(
  node: Partial<TreeNode<T>> = {}
): TreeNode<T> {
  return {
    id: node.id ?? crypto.randomUUID(),
    name: node.name ?? null,
    open: node.open ?? true,
    children: node.children ?? [],
    data: node.data as T,
  };
}

export class Tree<T = any> {
  protected root: TreeNode<T>[];

  constructor(tree: TreeNode<T>[]) {
    this.root = tree;
  }

  getRoot() {
    return this.root;
  }

  traverse(callback: TraverseCallback): boolean {
    return this.doTraverse(this.root, callback);
  }

  private doTraverse(
    nodes: TreeNode<T>[],
    callback: TraverseCallback,
    level: number = 0
  ): boolean {
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      if (
        callback(node, nodes, { get: () => i, set: (_i) => (i = _i) }, level)
      ) {
        return true;
      }
      if (
        node.children &&
        this.doTraverse(node.children, callback, level + 1)
      ) {
        return true;
      }
    }
    return false;
  }
}
