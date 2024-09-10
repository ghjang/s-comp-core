<script>
  import { createEventDispatcher, getContext } from "svelte";

  const dispatch = createEventDispatcher();

  export let label = "";
  export let value;

  const contextName = "toggle-group-context";
  const context = getContext(contextName);
  $: updateRadioButtonState($context);

  function updateRadioButtonState(context) {
    if (!context) {
      throw new Error(
        `The component must be used below a <ToggleGroup> parent component.`
      );
    }
  }

  // NOTE: 웹브라우저 개발자 환경에서 'input 태그 id 미지정 경고'를 제거하기 위한 더미 값임.
  const id = crypto.randomUUID();

  function handleRadioButtonClick() {
    dispatch("toggleItemChanged", {
      label,
      value: $context.activatedValue === value ? null : value,
    });
  }
</script>

<label>
  <input
    {id}
    type="radio"
    {value}
    checked={value === $context.activatedValue}
    on:click={handleRadioButtonClick}
  />
  {label}
</label>

<style lang="scss">
  label {
    user-select: none;

    input[type="radio"] {
      outline: none;
    }
  }
</style>
