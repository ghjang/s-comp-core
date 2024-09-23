<script lang="ts">
	import * as compMap from './componentMap.js';

	export function getRegisteredComponent(componentName: string): unknown {
		return compMap.getRegisteredComponent(componentName);
	}

	export async function load(componentName: string): Promise<unknown> {
		let componentClass = compMap.getRegisteredComponent(componentName);

		if (componentClass) {
			return componentClass;
		}

		const baseUrl = new URL(import.meta.url);
		const targetComponentBundle = baseUrl.pathname.replace(
			'ComponentLoader.js',
			`${componentName}.js`
		);

		const componentModule = await import(/* @vite-ignore */ targetComponentBundle);
		componentClass = componentModule.default;
		if (componentClass) {
			return compMap.registerComponent(componentName, componentClass);
		}
		throw new Error(`Failed to load component ${componentName}.`);
	}

	interface Item {
		component: string | unknown;
		[key: string]: unknown;
	}

	export async function loadAll(items: Item[]): Promise<unknown[]> {
		if (!items || items.length <= 0) {
			return [];
		}

		let loadTargetComponentNames = [
			...new Set(
				items
					.filter(
						(item): item is Item & { component: string } => typeof item.component === 'string'
					)
					.map((item) => item.component)
			)
		];

		loadTargetComponentNames = loadTargetComponentNames.filter(
			(componentName) => !getRegisteredComponent(componentName)
		);

		if (loadTargetComponentNames.length <= 0) {
			return [];
		}

		return Promise.all(
			loadTargetComponentNames.map(async (componentName) => {
				try {
					return await load(componentName);
				} catch (error) {
					// FIXME: 동적 컴포넌트 로딩시 '경쟁 조건' 발생으로 오류 발생 가능성이 있음.
					//
					// 동시에 여러개의 'ComponentLoader' 인스턴스가 생성되고
					// 각각의 인스턴스에서 'loadAll'을 호출하고 또 같은 컴포넌트를
					// 동시에 로딩하려고 할 때, 'ComponentMap'이 이미 등록된 컴포넌트를
					// 다시 로딩하려고해서 오류가 발생한다.
					//
					// 현재 시점에서 단순히 '재시도'하는 방식으로 해결 가능한 것으로 보이지만,
					// 좀더 나은 방법을 찾아서 시도해 볼 필요가 있다. (AsyncQueue 도입?)
					console.warn(error instanceof Error ? error.message : String(error));
					return await load(componentName); // Retry one more time.
				}
			})
		);
	}
</script>
