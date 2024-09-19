<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { ToggleGroupContext } from '../../ToggleGroup/types.js';
	import type { ToggleButtonEvent } from './types.js';

	const dispatch = createEventDispatcher<ToggleButtonEvent>();

	export let label: string = '';
	export let value: any;

	const contextName = 'toggle-group-context';
	const context = getContext<Writable<ToggleGroupContext>>(contextName);
	$: updateRadioButtonState($context);

	function updateRadioButtonState(context: ToggleGroupContext): void {
		if (!context) {
			throw new Error(`The component must be used below a <ToggleGroup> parent component.`);
		}
	}

	// NOTE: 웹브라우저 개발자 환경에서 'input 태그 id 미지정 경고'를 제거하기 위한 더미 값임.
	const id: string = crypto.randomUUID();

	function handleRadioButtonClick(): void {
		dispatch('toggleItemChanged', {
			label,
			value: $context.activatedValue === value ? null : value
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

		input[type='radio'] {
			outline: none;
		}
	}
</style>
