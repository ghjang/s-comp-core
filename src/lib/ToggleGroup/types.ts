import { type ComponentItem } from '../common/util/client/loader/ComponentLoader.js';

export interface ToggleGroupContext {
	activatedValue: unknown;
}

// ComponentItem에서 'component' 속성만 옵셔널로 변경
export type ToggleItem = Omit<ComponentItem, 'component'> & {
	component?: ComponentItem['component'];
};
