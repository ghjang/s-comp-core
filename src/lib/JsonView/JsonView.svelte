<script lang="ts">
  import TreeView from "../TreeView/TreeView.svelte";
  import { type TreeNode, createTreeNode } from "../common/tree.js";

  export let jsonData: object | string | null = {};
  export let openChildren = false;
  export let showCloseBracket = true;

  // JSON 데이터를 트리 데이터 형식으로 변환하는 함수
  function convertJsonToTreeData(
    json: object | string | null | undefined,
    level: number = 1,
    parentId: string | null = null,
  ): TreeNode[] {
    if (level === 1) {
      if (!json) {
        return [];
      }

      if (typeof json === "string") {
        const _json = JSON.parse(json);
        return convertJsonToTreeData(_json, level, parentId);
      }
    }

    const _json = json as Record<string, unknown>;
    const result: TreeNode[] = [];
    const keys = Object.keys(_json);

    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const id = `${parentId ?? ""}[${level}-${index}]`;
      const value = _json[key];

      if (Array.isArray(value)) {
        result.push(
          createTreeNode({
            id: `${id}-bracket-open`,
            name: `${key}: [`,
            open: openChildren,
            children: value.flatMap((item, idx) =>
              convertJsonToTreeData(
                { [`${idx}`]: item },
                level + 1,
                `[${id}-${idx}]`,
              ),
            ),
          }),
        );
        if (showCloseBracket) {
          result.push(createTreeNode({ id: `${id}-bracket-close`, name: "]" }));
        }
      } else if (typeof value === "object" && value !== null) {
        result.push(
          createTreeNode({
            id: `${id}-bracket-open`,
            name: `${key}: {`,
            open: openChildren,
            children: convertJsonToTreeData(value, level + 1, id),
          }),
        );
        if (showCloseBracket) {
          result.push(createTreeNode({ id: `${id}-bracket-close`, name: "}" }));
        }
      } else if (typeof value === "string") {
        result.push(createTreeNode({ id, name: `${key}: "${value}"` }));
      } else {
        result.push(createTreeNode({ id, name: `${key}: ${value}` }));
      }
    }

    return result;
  }

  function nodeStyler(
    htmlDomNode: HTMLElement,
    params: { treeNodeData: TreeNode },
  ) {
    const { treeNodeData } = params;
    const nodeName = treeNodeData.name;
    let [key, value] = nodeName?.includes(":")
      ? nodeName.split(/:(.+)/)
      : [nodeName];
    if (key) {
      if (!value) {
        if (/\{|\}|\[|\]/.test(key)) {
          if (key === "{" || key === "[") {
            if (treeNodeData.open) {
              htmlDomNode.innerHTML = `<span class="json-bracket">${key}</span>`;
            } else {
              const childrenLength = treeNodeData.children?.length ?? 0;
              const childrenLengthText = `(${childrenLength})`;
              const closeBracket = key === "{" ? "}" : "]";
              htmlDomNode.innerHTML = showCloseBracket
                ? `<span class="json-bracket">${key}</span>...<span class="json-children-count">${childrenLengthText}</span>`
                : `<span class="json-bracket">${key}...${childrenLengthText}...${closeBracket}</span>`;
            }
          } else {
            htmlDomNode.innerHTML = `<span class="json-bracket">${key}</span>`;
          }
        } else {
          htmlDomNode.innerHTML = `<span class="json-key">${key}</span>`;
        }
      } else {
        const trimmedOrgValue = value.trim();
        if (/^(['"]).*\1$/.test(trimmedOrgValue)) {
          // 문자열
          value = `<span class="json-string">${trimmedOrgValue}</span>`;
        } else if (/^[0-9]+$/.test(trimmedOrgValue)) {
          // 숫자
          value = `<span class="json-number">${trimmedOrgValue}</span>`;
        } else if (/^true|false$/.test(trimmedOrgValue)) {
          // 불리언
          value = `<span class="json-boolean">${trimmedOrgValue}</span>`;
        } else if (/\[|\{/.test(trimmedOrgValue)) {
          // 왼쪽 괄호([{,
          value = `<span class="json-bracket">${trimmedOrgValue}</span>`;
        } else {
          // 기타
          value = `<span class="json-other">${trimmedOrgValue}</span>`;
        }

        if (!treeNodeData.open) {
          if (/\[|\{/.test(trimmedOrgValue)) {
            const childrenLength = treeNodeData.children?.length ?? 0;
            const childrenLengthText = `(${childrenLength})`;
            const childrenLengthSpan = `<span class="json-children-count">${childrenLengthText}</span>`;
            if (showCloseBracket) {
              value = `${value}...${childrenLengthSpan}`;
            } else {
              const closeBracket = trimmedOrgValue === "{" ? "}" : "]";
              value = `${value}...${childrenLengthSpan}...${closeBracket}`;
            }
          }
        }
        htmlDomNode.innerHTML = `<span class="json-key">${key}</span>: ${value}`;
      }
    }
  }

  let treeData: TreeNode[] = [];

  $: if (jsonData) {
    const _treeData = convertJsonToTreeData(jsonData);
    const rootBracketOpenNode = createTreeNode({
      id: "root-bracket-open",
      name: "{",
      open: true,
      children: _treeData,
    });
    treeData = [rootBracketOpenNode];
    if (showCloseBracket) {
      const rootBracketCloseNode = createTreeNode({
        id: "root-bracket-close",
        name: "}",
      });
      treeData.push(rootBracketCloseNode);
    }
  }
</script>

<div class="json-view">
  <TreeView data={treeData} {nodeStyler} />
</div>

<style lang="scss">
  .json-view {
    :global(.tree-container) {
      outline: none;
    }

    :global(.json-key) {
      font-weight: bold;
      color: #881391; /* 보라색 계열로 변경 */
    }
    :global(.json-string) {
      color: #c41a16; /* 밝은 빨간색으로 변경 */
    }
    :global(.json-number) {
      color: #1c00cf; /* 진한 파란색으로 변경 */
    }
    :global(.json-boolean) {
      color: #0d904f; /* 진한 녹색으로 변경 */
    }
    :global(.json-bracket) {
      color: #000000; /* 검정색 유지 */
    }
    :global(.json-other) {
      color: #e17000; /* 주황색 조정 */
    }
    :global(.json-children-count) {
      color: #5a5a5a; /* 회색 조정 */
    }
  }
</style>
