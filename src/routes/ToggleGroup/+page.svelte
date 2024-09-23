<script lang="ts">
	import ToggleGroup from '$lib/ToggleGroup/ToggleGroup.svelte';
	import RadioButton from '$lib/Button/Toggle/RadioButton.svelte';
	import TabButton from '$lib/Button/Toggle/TabButton.svelte';
	import { type TabPosition } from '$lib/Tab/types.js';

	// TabButton '기본 속성' 생성 함수
	const createTabButtonProps = (tabPosition: TabPosition) => ({
		component: TabButton,
		tabPosition
	});

	// TabButton 아이템 정의
	const tabButtonItems = ['Tab Button 1', 'Tab Button 2', 'Tab Button 3'].map((label, index) => ({
		label,
		value: `tab${index + 1}`
	}));

	// event handlers
	function handleRadioItemChanged(event: CustomEvent) {
		console.log('radio', event.detail);
	}

	function handleTabItemChanged(event: CustomEvent) {
		console.log('tab', event.detail);
	}
</script>

<div class="toggleGroupContainer">
	<table>
		<tr>
			<td>
				<h2>Radio Button Group</h2>
			</td>
		</tr>
		<tr>
			<td>
				<ToggleGroup
					items={[
						{ component: RadioButton, label: 'Radio Button 1', value: 'radio1' },
						{ component: RadioButton, label: 'Radio Button 2', value: 'radio2' },
						{ component: RadioButton, label: 'Radio Button 3', value: 'radio3' }
					]}
					on:toggleItemChanged={handleRadioItemChanged}
				/>
			</td>
		</tr>
		<tr>
			<td>
				<h2>Tab Button Group</h2>
			</td>
		</tr>

		<tr>
			<td>
				<div class="tabButtonContainerTop">
					<ToggleGroup
						direction="horizontal"
						hAlign="left"
						vAlign="bottom"
						trapFocus={true}
						defaultItemProps={createTabButtonProps('top')}
						items={[...tabButtonItems]}
						on:toggleItemChanged={handleTabItemChanged}
					/>
				</div>
			</td>
		</tr>
		<tr>
			<td>
				<div class="tabButtonContainerRight">
					<ToggleGroup
						direction="vertical"
						hAlign="left"
						vAlign="top"
						trapFocus={true}
						defaultItemProps={createTabButtonProps('right')}
						items={[...tabButtonItems]}
						on:toggleItemChanged={handleTabItemChanged}
					/>
				</div>
			</td>
		</tr>
		<tr>
			<td>
				<div class="tabButtonContainerBottom">
					<ToggleGroup
						direction="horizontal"
						hAlign="left"
						vAlign="top"
						trapFocus={true}
						defaultItemProps={createTabButtonProps('bottom')}
						items={[...tabButtonItems]}
						on:toggleItemChanged={handleTabItemChanged}
					/>
				</div>
			</td>
		</tr>
		<tr>
			<td>
				<div class="tabButtonContainerLeft">
					<ToggleGroup
						direction="vertical"
						hAlign="right"
						vAlign="top"
						trapFocus={true}
						defaultItemProps={createTabButtonProps('left')}
						items={[...tabButtonItems]}
						on:toggleItemChanged={handleTabItemChanged}
					/>
				</div>
			</td>
		</tr>
	</table>
</div>

<style lang="scss">
	.toggleGroupContainer {
		height: 100vh;
		overflow-y: auto;

		table {
			width: 100%;

			div[class^='tabButtonContainer'] {
				margin: 2px;
				border: 2px solid black;
			}
		}
	}
</style>
