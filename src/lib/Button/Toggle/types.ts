export type ToggleItemInfo = {
	label: string;
	value: unknown;
};

export type ToggleButtonEvent = {
	toggleItemChanged: ToggleItemInfo;
};
