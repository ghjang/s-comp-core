import type { ComponentType } from 'svelte';

export interface Tab {
	label: string;
	component?: ComponentType | null | undefined;
	componentClassName?: string;
	props?: Record<string, unknown>;
}

export type TabPosition = 'top' | 'bottom' | 'left' | 'right';
export type TabDirection = 'vertical' | 'horizontal';
export type TabHAlign = 'left' | 'right';
export type TabVAlign = 'top' | 'bottom';
