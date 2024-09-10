<script>
  import { createEventDispatcher } from "svelte";
  import ToggleGroup from "../ToggleGroup/ToggleGroup.svelte";

  const dispatch = createEventDispatcher();

  export let tabs = [];
  export let selectedTabIndex = 0;
  export let tabPosition = "top";
  export let showContentControl = false;

  let tabItems = [];
  let tabDirection = "horizontal";
  let tabReverse = false;
  let tabHAlign = "left";
  let tabVAlign = "bottom";

  let activatedValue = null;

  $: updateTabs(tabs, selectedTabIndex, tabPosition);

  function updateTabs(tabs, selectedTabIndex, tabPosition) {
    if (tabs && tabs.length > 0) {
      tabItems.length = 0;

      tabs.forEach((item, index) => {
        const itemCopy = { ...item };
        itemCopy.component = "TabButton";
        itemCopy.tabPosition = tabPosition;
        delete itemCopy.componentClassName;
        delete itemCopy.props;

        if (itemCopy.label === undefined) {
          itemCopy.label = `Tab ${index + 1}`;
        }

        if (itemCopy.value === undefined) {
          itemCopy.value = `index-${index}`;
        }

        itemCopy.showDeleteButton = showContentControl;
        itemCopy.deleteButtonClick = (label, value) => {
          const tabIndex = parseInt(value.split("-")[1]);
          dispatch("tabDeleteButtonClicked", { label, tabIndex });
        };

        tabItems.push(itemCopy);
      });

      tabItems = [...tabItems];
    }

    activatedValue = tabItems[selectedTabIndex]?.value;

    updateTabPosition(tabPosition);
  }

  function updateTabPosition(tabPosition) {
    switch (tabPosition) {
      case "top":
        tabDirection = "horizontal";
        tabReverse = false;
        tabHAlign = "left";
        tabVAlign = "bottom";
        break;
      case "bottom":
        tabDirection = "horizontal";
        tabReverse = false;
        tabHAlign = "left";
        tabVAlign = "top";
        break;
      case "left":
        tabDirection = "vertical";
        tabReverse = true;
        tabHAlign = "right";
        tabVAlign = "top";
        break;
      case "right":
        tabDirection = "vertical";
        tabReverse = false;
        tabHAlign = "left";
        tabVAlign = "top";
        break;
    }
  }

  function handleToggleItemChanged(event) {
    const { detail } = event;
    detail.tabIndex = detail.itemIndex;
    dispatch("tabSelected", detail);
  }

  function handleAddTabButtonClick(event) {
    event.currentTarget.blur();
    dispatch("tabAddButtonClicked");
  }
</script>

<ToggleGroup
  direction={tabDirection}
  reverse={tabReverse}
  hAlign={tabHAlign}
  vAlign={tabVAlign}
  items={tabItems}
  {activatedValue}
  on:toggleItemChanged={handleToggleItemChanged}
>
  {#if showContentControl}
    <button
      class="add-tab-button"
      tabindex="-1"
      on:click={handleAddTabButtonClick}>&#10133;</button
    >
  {/if}
</ToggleGroup>

<style lang="scss">
  .add-tab-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1em;
    height: 1em;
    padding: 0.75em;
    border-radius: 50%;
    border: none;
    background-color: #f0f0f0;
    font-size: 0.75em;
    cursor: pointer;
    outline: none;

    &:hover {
      background-color: darkgray;
    }
  }
</style>
