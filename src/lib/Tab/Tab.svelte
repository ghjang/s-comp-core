<svelte:options accessors />

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { as } from '../common/util/util.js';
	import Floor from '../Floor/Floor.svelte';
	import StackPanel from '../Layout/StackPanel.svelte';
	import TabButtonGroup from './TabButtonGroup.svelte';
	import ContextMenuMediator from '../ContextMenuMediator/ContextMenuMediator.svelte';
	import PopUp from '../PopUp/PopUp.svelte';
	import { PopUpKind } from '../PopUp/PopUpKind.js';
	import { PopUpManager } from '../PopUp/util.js';
	import { findClosestAncestor } from '../common/util/util.dom.js';
	import { CustomEventsRegister, combineCustomEvents } from '../common/customEvents.js';
	import type { MenuItem } from '../ContextMenuMediator/types.js';
	import type { Tab, TabPosition, TabDirection, TabHAlign, TabVAlign } from './types.js';

	type TabEvents = {
		updateChildComponentInfo: {
			updateCallback: (childComponentInfo: unknown) => void;
		};
	};

	const dispatch = createEventDispatcher<TabEvents>();

	// FIXME: 다수의 '탭'들이 추가될 경우 탭이 잘려서 표시되거나 아예 보이지 않음.
	export let tabs: Tab[] = [];
	export let selectedTabIndex = 0;
	export let tabPosition: TabPosition = 'top';
	export let showContentControl = false;

	export let customEvents: string[] = ['updateChildComponentInfo'];

	export const getTabComponents = (): any[] => tabComponents;

	let tabComponents: any[] = [];
	let customEventsRegisters: CustomEventsRegister[] = [];

	let tabDirection: TabDirection = 'vertical';
	let tabHAlign: TabHAlign = 'left';
	let tabVAlign: TabVAlign = 'bottom';
	let tabReverse = false;

	let contextMenu: ContextMenuMediator;
	let menuItems: MenuItem[] = [];

	// NOTE: 탭 컴포넌트가 '추가, 삭제'될 경우에도 실행됨.
	$: if (tabs.length === tabComponents.length) {
		customEventsRegisters.forEach((register) => register?.unregister?.());
		customEventsRegisters = [];

		tabComponents.forEach((component, index) => {
			if (!component) {
				return;
			}

			const register = new CustomEventsRegister(
				dispatch,
				component,
				() => {
					// event의 'detail' 속성에 설정할 값
					return {
						componentName: 'Tab',
						tabComponents,
						selectedTabIndex
					};
				},
				(callback: (info: any) => void) => {
					// 'queryContainerInfo' 이벤트 발생시 'callback'으로 값 전달
					const ancestorElem = as<HTMLElement>(findClosestAncestor(tabView, 'floor-container'));
					if (ancestorElem) {
						callback({
							containerName: 'Tab',
							tabLength: tabs.length,
							tabIndex: index,
							ancestorFloorId: ancestorElem?.dataset.floorId,
							ensureTabVisible: (tabIndex: number) => (selectedTabIndex = tabIndex)
						});
					}
				}
			);

			customEventsRegisters.push(register);
		});

		tabComponents.forEach((component) => {
			if (component && component.customEvents) {
				customEvents = combineCustomEvents(component.customEvents, customEvents);
			}
		});
	}

	// NOTE: '모나코 에디터'와 같은 특정 컴포넌트는 화면에 보이지 않는 탭에 설정된 상태에서
	//       초기화되었을 경우에 자신의 화면을 정상적으로 'update(layout)'할 수 없는 문제가 있음.
	//       이를 해결하기 위해 명시적으로 탭이 선택되었을 때 명시적으로 컴포넌트에 'update' 함수가
	//       존재할 경우에 호출하도록해 workaround함.
	function updateSelectedTab(tabIndex: number, tabPosition: TabPosition): void {
		// '탭 컨텐트' 업데이트
		if (tabComponents[tabIndex] && typeof tabComponents[tabIndex].update === 'function') {
			const focus = true;
			tabComponents[tabIndex].update(focus);
		}

		// '탭 버튼 그릅' 위치 업데이트
		switch (tabPosition) {
			case 'top':
				tabDirection = 'vertical';
				tabHAlign = 'left';
				tabVAlign = 'bottom';
				tabReverse = false;
				break;

			case 'bottom':
				tabDirection = 'vertical';
				tabHAlign = 'left';
				tabVAlign = 'top';
				tabReverse = true;
				break;

			case 'left':
				tabDirection = 'horizontal';
				tabHAlign = 'right';
				tabVAlign = 'top';
				tabReverse = false;
				break;

			case 'right':
				tabDirection = 'horizontal';
				tabHAlign = 'left';
				tabVAlign = 'top';
				tabReverse = true;
				break;

			default:
				throw new Error(`Invalid tab position: ${tabPosition}`);
		}

		dispatch('updateChildComponentInfo', {
			updateCallback: (childComponentInfo: any) => {
				const _childComponentInfo = childComponentInfo.childComponentInfo;
				if (_childComponentInfo.componentClassName === 'Tab') {
					_childComponentInfo.props.selectedTabIndex = tabIndex;
					_childComponentInfo.props.tabPosition = tabPosition;
				}
			}
		});
	}

	$: updateSelectedTab(selectedTabIndex, tabPosition);

	let tabView: HTMLDivElement;

	const popUpManager = new PopUpManager();
	const popUpStore = popUpManager.store;

	async function handleKeyUp(event: KeyboardEvent): Promise<void> {
		if (event.ctrlKey && event.code === 'KeyN') {
			// 'Ctrl + N' 키 입력을 통한 '탭' 추가
			event.preventDefault();
			event.stopPropagation();
			await handleAddNewTab();
			tabView.focus();
		} else if (event.ctrlKey && event.code === 'KeyD') {
			// 'Ctrl + D' 키 입력을 통한 현재 선택된 '탭' 삭제
			event.preventDefault();
			event.stopPropagation();
			await handleDeleteCurrentTab();
			tabView.focus();
		} else {
			// 'Ctrl + 숫자' 키 입력을 통한 '탭' 선택, 'Ctrl + 1'은 '첫 번째 탭'을 의미함.
			const index = parseInt(event.key) - 1;
			if (event.ctrlKey && index >= 0 && index < tabs.length) {
				tabView.focus();
				selectedTabIndex = index;
				event.stopPropagation();
			}
		}
	}

	function handleTabsContextMenu(event: MouseEvent): void {
		if (!contextMenu) {
			return;
		}

		// NOTE: 최소 1개의 '기본 템플릿 성격의 탭'은 있어야 한다.
		const firstTabComponent = tabComponents[0];
		if (!firstTabComponent) {
			return;
		}

		menuItems = [];

		if (firstTabComponent instanceof Floor) {
			menuItems.push(
				{
					action: {
						text: 'Add New Tab',
						handler: handleAddNewTab
					}
				},
				{
					divider: { style: {} }
				}
			);
		}

		// '탭 위치' 변경 메뉴 항목 추가
		const tabPositions: TabPosition[] = ['top', 'bottom', 'left', 'right'];
		tabPositions.forEach((position) => {
			menuItems.push({
				action: {
					text: `${position}`,
					checked: tabPosition === position,
					handler: async () => (tabPosition = position)
				}
			});
		});

		contextMenu.showContextMenu(event, true, {
			parentBox: tabView,
			x: null,
			y: null
		});
	}

	function generateNewTabLabel(lastTabLabel: string): string {
		const match = lastTabLabel.match(/^(.*?)(\d+)$/);
		if (match) {
			const prefix = match[1];
			const lastNumber = parseInt(match[2]);
			return `${prefix}${lastNumber + 1}`;
		}
		return `${lastTabLabel} ${tabs.length + 1}`;
	}

	async function handleAddNewTab(): Promise<Tab | null> {
		if (!(tabComponents[0] instanceof Floor)) {
			return null;
		}

		const lastTabLabel = tabs[tabs.length - 1].label;
		const newTabLabel = generateNewTabLabel(lastTabLabel);
		const scriptBasePath = tabComponents[0].getComponentScriptBasePath();
		const items = tabComponents[0].getMenuItems();

		const newTabChildComponentInfo: Tab = {
			label: newTabLabel,
			component: Floor,
			componentClassName: 'Floor',
			props: {
				componentScriptBasePath: scriptBasePath,
				menuItems: items
			}
		};

		return new Promise((resolve) => {
			popUpManager.show({
				kind: PopUpKind.PROMPT,
				title: 'Tab Name',
				content: 'Input a New Tab Name:',
				userInput: newTabChildComponentInfo.label,
				onConfirm: (userInput?: string) => {
					if (userInput && userInput.trim()) {
						newTabChildComponentInfo.label = userInput;
						tabs = [...tabs, newTabChildComponentInfo];
						selectedTabIndex = tabs.length - 1;

						dispatch('updateChildComponentInfo', {
							updateCallback: (childComponentInfo: any) => {
								const _childInfo = childComponentInfo.childComponentInfo;
								_childInfo.props.tabs.push(newTabChildComponentInfo);
								_childInfo.props.selectedTabIndex = selectedTabIndex;
							}
						});

						resolve(newTabChildComponentInfo);
					} else {
						resolve(null);
					}
				},
				onCancel: () => {
					resolve(null);
				}
			});
		});
	}

	async function handleDeleteCurrentTab(): Promise<boolean> {
		if (tabs.length <= 1) {
			console.info('The last tab cannot be deleted.');
			return false;
		}

		const tabToDelete = tabs[selectedTabIndex];

		return new Promise((resolve) => {
			popUpManager.show({
				kind: PopUpKind.CONFIRM,
				title: 'Delete Tab',
				content: `Are you sure you want to delete the tab "${tabToDelete.label}"?`,
				onConfirm: async () => {
					const deletedTabIndex = selectedTabIndex;
					const tabCompToDelete = tabComponents[selectedTabIndex];

					const newTabs = tabs.filter((_, index) => index !== selectedTabIndex);
					let newSelectedTabIndex = selectedTabIndex;

					if (selectedTabIndex >= newTabs.length) {
						newSelectedTabIndex = newTabs.length - 1;
					}

					if (tabCompToDelete instanceof Floor) {
						const tabIndexUpdateInfo = {
							deletedTabIndex,
							newTabLength: newTabs.length,
							newSelectedTabIndex
						};
						await tabCompToDelete.removeTabFloor(tabIndexUpdateInfo);
					}

					tabs = newTabs;
					selectedTabIndex = newSelectedTabIndex;

					dispatch('updateChildComponentInfo', {
						updateCallback: (childComponentInfo: any) => {
							const _childInfo = childComponentInfo.childComponentInfo;
							_childInfo.props.tabs = tabs;
							_childInfo.props.selectedTabIndex = selectedTabIndex;
						}
					});

					resolve(true);
				},
				onCancel: () => {
					resolve(false);
				}
			});
		});
	}

	function handleTabSelected(event: CustomEvent<{ tabIndex: number }>): void {
		const { tabIndex } = event.detail;
		selectedTabIndex = tabIndex;
	}

	function handleTabDeleteButtonClicked(event: CustomEvent<{ tabIndex: number }>): void {
		const targetTabIndex = event.detail.tabIndex;
		if (targetTabIndex === selectedTabIndex) {
			handleDeleteCurrentTab();
		}
	}

	async function handleMenuItemClicked(event: CustomEvent<MenuItem>): Promise<void> {
		const { action } = event.detail;
		if (action && typeof action.handler === 'function') {
			await action.handler();
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	bind:this={tabView}
	class="tab-view {tabPosition}"
	tabindex="-1"
	on:keyup={handleKeyUp}
	on:contextmenu|preventDefault|stopPropagation
>
	<StackPanel direction={tabDirection} hAlign={tabHAlign} vAlign={tabVAlign} reverse={tabReverse}>
		<div class="tabs" on:contextmenu|preventDefault|stopPropagation={handleTabsContextMenu}>
			<TabButtonGroup
				{tabs}
				{selectedTabIndex}
				{tabPosition}
				{showContentControl}
				on:tabSelected={handleTabSelected}
				on:tabDeleteButtonClicked={handleTabDeleteButtonClicked}
				on:tabAddButtonClicked={handleAddNewTab}
			/>
		</div>

		{#if tabs.length > 0}
			<!--
        NOTE: 'each'로 렌더링시 '키(이 경우 tab)'을 지정하지 않으면
              '탭 삭제'를 하는 경우에 이전에 생성했던 (더이상 유효하지 않은) 탭 컨텐트가 나타날 수 있음.
      -->
			{#each tabs as tab, index (tab)}
				<div
					class="tab-content"
					class:selected={selectedTabIndex === index}
					data-tab-content-index={index}
				>
					{#if tab.component}
						{@const props = tab.props || {}}
						<svelte:component this={tab.component} bind:this={tabComponents[index]} {...props} />
					{:else}
						<div bind:this={tabComponents[index]}>
							{JSON.stringify(tab)}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</StackPanel>
</div>

{#if showContentControl}
	<ContextMenuMediator
		{menuItems}
		bind:this={contextMenu}
		on:menuItemClicked={handleMenuItemClicked}
	/>
{/if}

{#if $popUpStore}
	<PopUp
		kind={$popUpStore.kind}
		title={$popUpStore.title}
		content={$popUpStore.content}
		userInput={$popUpStore.userInput}
		on:buttonClicked={(e) => popUpManager.handleButtonClicked(e)}
	/>
{/if}

<style lang="scss">
	$tabs-length: 1.25em;
	$button-margin: 0.2em;

	.tab-view {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		outline: none;

		.tabs {
			background-color: #f0f0f0;
		}

		/*
      NOTE: 'flex-grow: 1'을 'tab-content'에 적용해본 결과 원하는 형태가 아닌 것으로 확인되어,
            일단 'width, height'를 기존 방식으로 설정해 사용하도록 함.
     */
		.tab-content {
			display: none;
			width: 100%;
			height: 100%;

			&.selected {
				display: block;
			}
		}

		&.top,
		&.bottom {
			:global(> div > .tabs) {
				height: $tabs-length;
				width: 100%;
			}

			:global(> div > .tab-content) {
				height: calc(100% - $tabs-length);
			}
		}

		&.left,
		&.right {
			:global(> div > .tabs) {
				width: $tabs-length;
				height: 100%;
			}

			:global(> div > .tab-content) {
				width: calc(100% - $tabs-length);
			}
		}
	}
</style>
