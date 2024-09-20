<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ToggleGroup from '../ToggleGroup/ToggleGroup.svelte';
	import type { Tab, TabPosition, TabDirection, TabHAlign, TabVAlign } from './types.js';
	import type { ToggleItem } from '../ToggleGroup/types.js';

	type TabButtonGroupEvents = {
		tabSelected: { tabIndex: number };
		tabAddButtonClicked: void;
		tabDeleteButtonClicked: { label: string; tabIndex: number };
	};

	const dispatch = createEventDispatcher<TabButtonGroupEvents>();

	export let tabs: Tab[] = [];
	export let selectedTabIndex = 0;
	export let tabPosition: TabPosition = 'top';
	export let showContentControl = false;

	let tabItems: Array<ToggleItem> = [];
	let tabDirection: TabDirection = 'horizontal';
	let tabReverse = false;
	let tabHAlign: TabHAlign = 'left';
	let tabVAlign: TabVAlign = 'bottom';

	let activatedValue: unknown = null;

	$: updateTabs(tabs, selectedTabIndex, tabPosition);

	function updateTabs(tabs: Tab[], selectedTabIndex: number, tabPosition: TabPosition) {
		if (tabs && tabs.length > 0) {
			tabItems.length = 0;

			tabs.forEach((item: Tab, index: number) => {
				const itemCopy: ToggleItem = { ...item };
				itemCopy.component = 'TabButton';
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
				itemCopy.deleteButtonClick = (label: string, value: unknown) => {
					const tabIndex = parseInt((value as string).split('-')[1]);
					dispatch('tabDeleteButtonClicked', { label, tabIndex });
				};

				tabItems.push(itemCopy);
			});

			tabItems = [...tabItems];
		}

		activatedValue = tabItems[selectedTabIndex]?.value;

		updateTabPosition(tabPosition);
	}

	function updateTabPosition(tabPosition: TabPosition) {
		switch (tabPosition) {
			case 'top':
				tabDirection = 'horizontal';
				tabReverse = false;
				tabHAlign = 'left';
				tabVAlign = 'bottom';
				break;
			case 'bottom':
				tabDirection = 'horizontal';
				tabReverse = false;
				tabHAlign = 'left';
				tabVAlign = 'top';
				break;
			case 'left':
				tabDirection = 'vertical';
				tabReverse = true;
				tabHAlign = 'right';
				tabVAlign = 'top';
				break;
			case 'right':
				tabDirection = 'vertical';
				tabReverse = false;
				tabHAlign = 'left';
				tabVAlign = 'top';
				break;
		}
	}

	function handleToggleItemChanged(event: CustomEvent<{ itemIndex: number }>) {
		const { itemIndex } = event.detail;
		dispatch('tabSelected', { tabIndex: itemIndex });
	}

	function handleAddTabButtonClick(event: MouseEvent) {
		(event.currentTarget as HTMLElement)?.blur();
		dispatch('tabAddButtonClicked');
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
		<button class="add-tab-button" tabindex="-1" on:click={handleAddTabButtonClick}>&#10133;</button
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
