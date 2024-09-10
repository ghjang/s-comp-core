<script lang="ts">
  // TODO: 여러 유형의 '콘솔 출력' 정의
  //
  // 현재 '문자열'을 입력하는 것으로만 처리하고 있음. 다음과 같은 유형을 지원할 수 있을 것 같음:
  // - 문자열
  // - 객체
  // - 배열
  // - 유용한 특수 데이터에 대한 출력 포맷 (예: 표, 그래프, 이미지)

  import { onMount } from "svelte";
  import { preventOverscroll } from "../common/action/preventOverscroll.js";
  import { type DataProps, DataSink } from "../common/data/DataStore.js";

  export let height = "100%";
  export let fontSize = "0.5em";
  export let backgroundColor = "black";

  export let initialOutput = null;
  export let autoClear = false;
  export let autoScrollDown = true;

  type ConsoleOutput = string | object;

  let consoleDiv: HTMLDivElement;

  export function getDataSink(): DataSink {
    interface Data {
      detail?: {
        log?: ConsoleOutput;
        error?: ConsoleOutput;
      };
      [key: string]: any;
    }

    return new (class extends DataSink {
      isCompatible(props: DataProps): boolean {
        return props.sourceComponentName === "PyRun";
      }

      update(data: Data) {
        const { detail } = data;
        if (Object.keys(data).length === 0) {
          // 완전히 '빈 객체'는 무시
        } else if (detail?.log) {
          log(detail.log);
        } else if (detail?.error) {
          error(detail.error);
        } else {
          error(`invalid console data: ${JSON.stringify(data)}`);
        }
      }
    })();
  }

  export function update() {
    if (consoleDiv) {
      // FIXME: 부모 컨테이너가 'Splitter'인 경우에 대해서만 부모의 배경색 업데이트를 하드코딩으로 처리하고 있음.
      //
      // 임의의 부모 컨테이너에 대해서도 처리할 수 있도록 수정 필요.
      const parent = consoleDiv.parentElement;
      if (parent && parent.tagName === "DIV" && parent.classList.contains("content-panel")) {
        parent.style.backgroundColor = backgroundColor;
      }
    }
  }

  export function clear() {
    if (!consoleDiv) {
      return;
    }

    consoleDiv.innerHTML = "";
  }

  export function log(output: ConsoleOutput) {
    if (!consoleDiv) {
      return;
    }

    output = processNewLine(output);

    if (autoClear) {
      clear();
    }

    consoleDiv.innerHTML += `<div>${output}</div>`;

    if (autoScrollDown) {
      consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
  }

  export function error(output: ConsoleOutput) {
    if (!consoleDiv) {
      return;
    }

    if (typeof output === "object" && output instanceof Error) {
      output = output.message;
    }

    output = processNewLine(output);

    if (autoClear) {
      clear();
    }

    consoleDiv.innerHTML += `<div style="color: red;">${output}</div>`;

    if (autoScrollDown) {
      consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
  }

  function processNewLine(output: ConsoleOutput) {
    return typeof output !== "string" ? output : output.replace(/\n/g, "<br>");
  }

  onMount(() => {
    if (initialOutput) {
      log(initialOutput);
    }
  });
</script>

<div
  class="console-output"
  bind:this={consoleDiv}
  style:height
  style:font-size={fontSize}
  style:background-color={backgroundColor}
  use:preventOverscroll
></div>

<style>
  .console-output {
    width: 100%;
    padding: 10px;
    overflow: auto;
    box-sizing: border-box;
    white-space: pre-wrap;
    font-family: monospace;
    color: lime;
  }
</style>
