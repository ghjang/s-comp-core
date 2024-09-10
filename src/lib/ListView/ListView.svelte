<script lang="ts">
  import { camelToKebab } from "../common/util/util.js";
  import IndexedDBManager from "../common/data/IndexedDBManager.js";
  import type { Store, Header, Row, StyleProps } from "./types.js";

  export let header: Header = {
    fieldNames: [],
  };
  export let items: Row[] = [];
  export let defaultHeaderStyle: StyleProps = {
    fontWeight: "bold",
    fontFamily: "'Noto Sans KR', sans-serif",
    backgroundColor: "#f0f0f0",
    textAlign: "center",
  };
  export let defaultBodyStyle: StyleProps | StyleProps[] = {
    fontFamily: "'Noto Sans KR', sans-serif",
  };
  export let enableColumnResize: boolean = true;
  export let alternatingRowColor: string | null = "#f8f8f8";
  export let capitalizeHeaders: boolean = true;

  export let store: Store | null = null;

  // 'ListView'의 최대 높이
  export let maxHeight = "none";

  // 'ListView'의 테이블 레이아웃
  // ; 'fixed'로 설정하면 '넓이'가 '부모 요소'의 넓이에 맞추어 고정된다.
  //   '수평 스크롤'이 생성되지 않고 넓이가 딱 맞아 떨어진다.
  //   이때 '테이블 셀'내의 컨텐트는 현재 설정에서 자동으로 줄어들어 표시된다.
  export let tableLayout: "auto" | "fixed" | "inherit" = "fixed";

  function getValue(item: Row, field: string): any {
    return item[field] || "";
  }

  // displayNames가 지정되었지만 fieldNames와 길이가 다른 경우 에러를 발생시킨다.
  $: if (
    header.displayNames &&
    header.displayNames.length !== header.fieldNames.length
  ) {
    throw new Error(
      "displayNames가 지정된 경우, fieldNames와 길이가 같아야 합니다.",
    );
  }

  // displayNames가 없는 경우 fieldNames를 기반으로 자동 생성시킨다.
  $: displayNames =
    header.displayNames ||
    header.fieldNames.map((field) =>
      capitalizeHeaders
        ? field.charAt(0).toUpperCase() + field.slice(1)
        : field,
    );

  $: if (header.style) {
    if (
      Array.isArray(header.style) &&
      header.style.length !== header.fieldNames.length
    ) {
      throw new Error("styles는 반드시 fieldNames와 길이가 같아야 합니다.");
    }
  }

  $: if (defaultBodyStyle) {
    if (
      Array.isArray(defaultBodyStyle) &&
      defaultBodyStyle.length !== header.fieldNames.length
    ) {
      throw new Error(
        "defaultBodyStyle는 반드시 fieldNames와 길이가 같아야 합니다.",
      );
    }
  }

  function getColumnStyle(index: number): StyleProps {
    if (!header.style) return {};
    if (Array.isArray(header.style)) {
      return header.style[index] || {};
    }
    return header.style;
  }

  function getStyleString(style: StyleProps): string {
    return Object.entries(style)
      .map(([key, value]) => `${camelToKebab(key)}:${value}`)
      .join(";");
  }

  function getHeaderColumnStyle(index: number): string {
    const style = { ...defaultHeaderStyle, ...getColumnStyle(index) };
    return getStyleString(style);
  }

  function getBodyColumnStyle(
    item: Row,
    index: number,
    fieldName: string,
  ): string {
    const defaultStyle = Array.isArray(defaultBodyStyle)
      ? defaultBodyStyle[index] ?? {}
      : defaultBodyStyle;
    const styleFieldName = `${fieldName}Style`;
    const style = { ...defaultStyle, ...(item[styleFieldName] ?? {}) };
    return getStyleString(style);
  }

  let columnWidths: number[] = [];

  // 초기 컬럼 너비 설정
  $: {
    const totalWidth = 100;
    const columnCount = header.fieldNames.length;
    const defaultColumnWidth = totalWidth / columnCount;
    columnWidths = header.fieldNames.map(() => defaultColumnWidth);
  }

  function startResize(index: number) {
    return (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.pageX;
      const startWidths = [...columnWidths];
      const tableWidth =
        document.querySelector(".list-view table")?.clientWidth || 1;

      function onMouseMove(e: MouseEvent) {
        const diff = e.pageX - startX;
        const percentDiff = (diff / tableWidth) * 100;

        let newLeftWidth = Math.max(10, startWidths[index] + percentDiff);
        let newRightWidth = Math.max(10, startWidths[index + 1] - percentDiff);

        // 전체 너비를 유지하기 위해 조정
        const totalNewWidth = newLeftWidth + newRightWidth;
        const totalOriginalWidth = startWidths[index] + startWidths[index + 1];
        const scale = totalOriginalWidth / totalNewWidth;

        newLeftWidth *= scale;
        newRightWidth *= scale;

        columnWidths[index] = newLeftWidth;
        columnWidths[index + 1] = newRightWidth;

        columnWidths = [...columnWidths]; // 반응성 트리거
      }

      function onMouseUp() {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };
  }

  async function fetchStoreInfo(store: Store) {
    const storeInfo = await IndexedDBManager.getStoreInfo(
      store.dbName,
      store.dbVersion,
      store.storeName,
    );
    if (!storeInfo) {
      throw new Error("Store not found");
    }
    store.keyPath = storeInfo.keyPath;
    store.indexes = storeInfo.indexes;
    store.recordCount = storeInfo.recordCount;
  }

  async function fetchStoreAllData(store: Store) {
    const data = await IndexedDBManager.getAllData(
      store.dbName,
      store.dbVersion,
      store.storeName,
    );
    if (data.length > 0) {
      header.fieldNames = Object.keys(data[0] as object);
      capitalizeHeaders = false;
      displayNames = header.fieldNames;
      items = data as Row[];
    }
  }

  $: if (store) {
    fetchStoreInfo(store).then(() => fetchStoreAllData(store));
  }
</script>

<div
  class="list-view"
  class:resizable={enableColumnResize}
  class:alternating={alternatingRowColor !== null}
  style="--alternating-row-color: {alternatingRowColor || 'transparent'}"
  style:max-height={maxHeight}
>
  <table style:table-layout={tableLayout}>
    <colgroup>
      {#each columnWidths as width, i}
        <col style="width: {width}%;" />
      {/each}
    </colgroup>
    <thead>
      <tr>
        {#each displayNames as displayName, index}
          <th style={getHeaderColumnStyle(index)}>
            {displayName}
            {#if enableColumnResize && index < displayNames.length - 1}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div class="resizer" on:mousedown={startResize(index)}></div>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each items as item, index (item.id ?? index)}
        <tr>
          {#each header.fieldNames as fieldName, fieldIndex}
            <td style={getBodyColumnStyle(item, fieldIndex, fieldName)}>
              {getValue(item, fieldName)}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style lang="scss">
  $border-color: #ccc;
  $header-bg-color: #f0f0f0;
  $header-gradient-start: #ffffff;
  $header-gradient-end: #e0e0e0;
  $row-even-bg-color: #f8f8f8;
  $row-hover-bg-color: #e8e8e8;
  $resizer-color: #a0a0a0;
  $resizer-active-color: #606060;
  $cell-padding: 8px;
  $cell-min-width: 50px;
  $resizer-width: 1px;
  $resizer-hover-width: 3px;
  $resizer-hover-color: #4a90e2;

  .list-view {
    border: 1px solid $border-color;
    overflow-x: auto;
    display: flex;
    flex-direction: column;
    height: 100%;

    table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;

      thead {
        position: sticky;
        top: 0;
        z-index: 2;
        background-color: $header-bg-color;
      }

      tbody {
        overflow-y: auto;
        width: 100%;

        tr {
          &:nth-child(even) {
            background-color: var(--alternating-row-color);
          }

          &:hover {
            background-color: $row-hover-bg-color !important;
          }
        }
      }

      th,
      td {
        padding: $cell-padding;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border: 1px solid $border-color;
        min-width: $cell-min-width;
      }

      th {
        position: relative;
        background-color: $header-bg-color;
        font-weight: bold;
        border-top: 0;
        border-bottom: 1px solid $border-color;
        box-shadow:
          0 2px 3px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.5),
          inset 0 -1px 0 rgba(0, 0, 0, 0.1);
        background-image: linear-gradient(
          to bottom,
          $header-gradient-start,
          $header-gradient-end
        );
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
        transition: background-image 0.2s ease;

        &:hover {
          background-image: linear-gradient(
            to bottom,
            lighten($header-gradient-start, 5%),
            lighten($header-gradient-end, 5%)
          );
        }

        &:hover .resizer {
          opacity: 1;
        }
      }

      &.resizable {
        th:not(:last-child),
        td:not(:last-child) {
          border-right: 1px solid lighten($border-color, 10%);
        }

        th:not(:last-child) {
          padding-right: $cell-padding;
        }
      }
    }

    /*
     NOTE: 원래 '리싸이저'를 호버링시에 화면에 표시하도록 했었다.
           헌데 현재의 CSS 설정에서 아래와 같이 'right: -2px'로 설정하면
           지정한 생색의 리싸이저가 보이지는 않지만 컬럼 리싸이징은 제대로 된다.
           리싸이저 위치가 완전히 컬럼 구분 수직선과 일치하지는 않지만 크게 이상해보이지는 않는다.
    */
    .resizer {
      position: absolute;
      right: -2px;
      top: 0;
      height: 100%;
      width: $resizer-hover-width;
      background: transparent;
      cursor: col-resize;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.2s ease;

      &::after {
        content: "";
        position: absolute;
        left: 1px;
        top: 0;
        height: 100%;
        width: $resizer-width;
        background: $resizer-color;
        opacity: 0.3;
        transition:
          opacity 0.2s ease,
          width 0.2s ease,
          background-color 0.2s ease;
      }

      &:hover::after,
      &:active::after {
        opacity: 1;
        width: $resizer-hover-width;
        background-color: $resizer-hover-color;
      }
    }

    tbody {
      tr {
        &:nth-child(even) {
          background-color: var(--alternating-row-color);
        }

        &:hover {
          background-color: $row-hover-bg-color !important;
        }

        td {
          padding: $cell-padding;
        }
      }
    }

    &.alternating {
      tbody {
        tr {
          &:nth-child(even) {
            background-color: var(--alternating-row-color);
          }
        }
      }
    }
  }
</style>
