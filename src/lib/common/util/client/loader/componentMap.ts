interface ComponentConstructor<Props = Record<string, unknown>, ReturnType = unknown> {
	new (options: { target: Element; props: Props }): ReturnType;
}

const classMap: Record<string, ComponentConstructor> = {};

export const getNumberOfRegisteredComponents = (): number => Object.keys(classMap).length;

export const getRegisteredComponentNames = (): string[] => Object.keys(classMap);

export const getRegisteredComponentClasses = (): ComponentConstructor[] => Object.values(classMap);

export const getRegisteredComponent = (className: string): ComponentConstructor | undefined =>
	classMap[className];

export const registerComponent = (
	...args: [string, ComponentConstructor] | [ComponentConstructor]
): ComponentConstructor => {
	let className: string;
	let classReference: ComponentConstructor;

	if (args.length === 1) {
		// 단일 인자 제공 시, 클래스 레퍼런스의 이름을 키로 사용
		classReference = args[0];

		if (!classReference.name) {
			throw new Error(`Class name is not defined: ${classReference}`);
		}

		className = classReference.name;
	} else if (args.length === 2) {
		// 두 개의 인자 제공 시, 첫 번째 인자를 클래스 이름 키로 사용
		[className, classReference] = args;
	} else {
		throw new Error(`Invalid arguments provided to registerClass: ${args}`);
	}

	if (getRegisteredComponent(className)) {
		throw new Error(`Class '${className}' is already registered`);
	}

	classMap[className] = classReference;

	return classReference;
};

export const unregisterComponent = (className: string): void => {
	if (!getRegisteredComponent(className)) {
		throw new Error(`Class '${className}' is not registered`);
	}

	delete classMap[className];
};

export const createComponent = (
	className: string,
	props: Record<string, unknown>,
	targetElement: Element
): InstanceType<ComponentConstructor> => {
	const Class = classMap[className];
	if (Class) {
		return new Class({
			target: targetElement,
			props
		});
	} else {
		throw new Error(`Class '${className}' not found`);
	}
};
