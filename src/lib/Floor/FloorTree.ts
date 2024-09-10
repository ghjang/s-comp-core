/*=============================================================================
 * 최상위에 계층에 위치한 'Floor' 컴포넌트가 '디자인 모드'로 동작시 좌측의 '컴포넌트 트리'를
 * 표현하기 위한 '스벨트 스토어 컨텍스트' 데이터 조작을 위한 내부 구현 함수들이다.
 *============================================================================*/

import { Tree, type TreeNode, createTreeNode } from "../common/tree.js";
import { type ChildComponentInfo } from "./types.js";

export default class FloorTree extends Tree {
  /**
   * 'ancestorFloorId'를 조상으로 하는 새로운 빈 노드를 추가한다.
   * @param ancestorFloorId 조상 노드의 ID
   * @param newFloorId 새로운 노드의 ID
   * @returns 노드를 추가했는지 여부
   */
  appendNewEmptyNode(ancestorFloorId: string, newFloorId: string): boolean {
    return this.traverse((node) => {
      if (node.id === ancestorFloorId) {
        const newNode = createTreeNode({ id: newFloorId });
        node.children = node.children ?? [];
        node.children.push(newNode);
        return true;
      }
      return false;
    });
  }

  /**
   * 'floorId'를 가진 노드의 이름을 초기화한다.
   * @param floorId 노드의 ID
   * @returns 노드를 초기화했는지 여부
   */
  resetNode(floorId: string): boolean {
    return this.traverse((node) => {
      if (node.id === floorId) {
        node.name = null;
        node.children = [];
        return true;
      }
      return false;
    });
  }

  /**
   * 'floorId'를 가진 노드의 이름을 업데이트한다.
   * @param floorId 노드의 ID
   * @param childComponentInfo 자식 컴포넌트 정보
   * @param isDesignMode 디자인 모드 여부
   * @param debug 디버그 모드 여부
   * @returns 노드를 업데이트했는지 여부
   */
  updateNode(
    id: string,
    childComponentInfo: ChildComponentInfo,
    isDesignMode: boolean,
    debug = false
  ): boolean {
    return this.traverse((node) => {
      if (node.id === id) {
        let compName;

        if (typeof childComponentInfo.componentClass === "function") {
          // NOTE: '릴리즈 번들링 최적화'시에 '컴포넌트 클래스'를 사용하는 경우에
          //       '클래스 이름'이 '축소 변경'될 수 있어 '원래의 클래스 이름'을
          //       클래스 생성자 함수로부터 얻을 수가 없어 명시적으로 지정된
          //       '컴포넌트 클래스 이름'을 사용한다.
          compName = childComponentInfo.componentClassName;
        } else {
          compName = childComponentInfo.customElementName;
        }

        if (!compName) {
          throw new Error("Component name is required.");
        }

        if (compName === "Splitter" || compName === "Tab") {
          childComponentInfo.props = {
            ...childComponentInfo.props,
            showContentControl: isDesignMode,
          };
          if (compName === "Splitter") {
            childComponentInfo.props.showPanelResizingInfo = isDesignMode;
          }
        }

        const compNodeName = childComponentInfo.componentNodeName || compName;
        node.name = debug ? `${id} => ${compNodeName}` : compNodeName;
        node.children = node.children ?? [];

        return true;
      }
      return false;
    });
  }

  /**
   * 'tree' 전체를 순회하면서 'oldId'를 'newId'로 변경한다.
   * @param oldId 변경할 기존 ID
   * @param newId 새로운 ID
   */
  replaceNodeId(oldId: string, newId: string) {
    this.traverse((node) => {
      if (node.id === oldId) {
        node.id = newId;
      }
    });
  }

  /**
   * 'tree' 노드 중에 'id'가 'floorId'인 노드를 찾아서 그 노드를 삭제한다.
   * @param id 삭제할 노드의 ID
   * @returns 노드를 삭제했는지 여부
   */
  removeNode(id: string): boolean {
    return this.traverse((node, upperNodes, nodeIndex) => {
      if (node.id === id) {
        upperNodes.splice(nodeIndex.get(), 1);
        return true;
      }
      return false;
    });
  }

  /**
   * Floor 트리 노드 중에 'id'가 'HTML DOM 트리'에서 존재하지 않는 노드들을 제거한다.
   * @param excludeIdMap 삭제에서 제외할 ID 맵
   */
  removeInvalidNodes(excludeIdMap: Map<string, string>) {
    const floorRootElem = document.querySelector(
      "div.floor-container[data-floor-id='floor-root'][data-floor-level='0']"
    );

    if (!floorRootElem && this.root.length !== 0) {
      throw new Error("Root floor not found.");
    }

    // NOTE: 'SCompBox'내에 '루트 노드'가 '1개'만 존재하는 것으로 가정했다.
    //       (SCompBox를 1개만 사용하는 경우를 가정했다.)
    if (this.root.length !== 1) {
      return;
    }

    const keySet = new Set(excludeIdMap?.keys());
    const valueSet = new Set(excludeIdMap?.values());
    const excludeIds = new Set([...keySet, ...valueSet]);

    if (floorRootElem && this.root[0].children) {
      removeInvalidNodeArrayElement(floorRootElem, this.root[0].children);
    }

    function removeInvalidNodeArrayElement(
      parentElem: Element,
      treeData: TreeNode[]
    ) {
      for (let i = 0; i < treeData.length; ++i) {
        const node = treeData[i];
        const floorElem = parentElem.querySelector(
          `[data-floor-id="${node.id}"]`
        );

        if (!floorElem && !excludeIds.has(node.id)) {
          console.log(`removed invalid node: ${node.id}`);
          treeData.splice(i, 1);
          --i;
        } else if (floorElem && node.children && node.children.length > 0) {
          removeInvalidNodeArrayElement(floorElem, node.children);
        }
      }
    }
  }
}
