/*
 * '컴파일 타임'에서는 'obj'가 'T 타입'인 경우와 'null'인 경우만을 허용해 정상 컴파일됨.
 *  obj가 T 타입이 아니고 null도 아닌 경우에는 '컴파일 에러'가 발생함.
 *
 * 컴파일을 통해서 생성된 코드는 '런 타임'에서 아무런 타입 체크를 하지않고 단순히 전단된 값을
 * 다시 반환만 함. 즉, 다음과 같은 '자바스크립트 코드'가 생성될 것임:
 *   function as(obj) {
 *     return obj;
 *   }
 *
 * 결과적으로 컴파일 타임에서의 타입 체크에만 목적이 있는 구현 코드임.
 */
export function as<T>(obj: unknown): T | null {
	return obj as T | null;
}

// ex.) fontWeight -> font-weight
export function camelToKebab(str: string): string {
	return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function isAsyncFunction(func: any): boolean {
	return func.constructor?.name === 'AsyncFunction';
}

export function fileExists(filePath: string): Promise<boolean> {
	return new Promise((resolve) => {
		fetch(filePath, { method: 'HEAD' })
			.then((response) => resolve(response.status !== 404))
			.catch(() => resolve(false));
	});
}

export function loadScript(
	scriptPath: string,
	ignoreIfNotFound: boolean = false,
	isModule: boolean = true
): Promise<void> {
	return new Promise((resolve, reject) => {
		const existingScript = document.head.querySelector(
			`script[src="${scriptPath}"]`
		) as HTMLScriptElement | null;
		if (existingScript) {
			resolve();
			return;
		}

		fetch(scriptPath, { method: 'HEAD' })
			.then((response) => {
				if (response.status === 404) {
					if (ignoreIfNotFound) {
						console.warn(`Script not found: ${scriptPath}`);
						resolve();
					} else {
						throw new Error(`Script not found: ${scriptPath}`);
					}
				} else {
					const scriptElem = document.createElement('script');
					if (isModule) {
						scriptElem.type = 'module';
					}
					scriptElem.src = scriptPath;

					scriptElem.onload = () => resolve();
					scriptElem.onerror = () => reject(new Error(`Failed to load script: ${scriptPath}`));

					document.head.appendChild(scriptElem);
				}
			})
			.catch((error) => {
				if (ignoreIfNotFound) {
					console.warn(error.message);
					resolve();
				} else {
					reject(error);
				}
			});
	});
}

export function loadClassFromModule(modulePath: string, className: string): Promise<any> {
	return new Promise((resolve, reject) => {
		import(/* @vite-ignore */ modulePath)
			.then((module) => {
				// NOTE: 'module.default.name' 값은 '번들링 최적화'시에 원래의 이름이 아닌 변경된 (짧게 축소된) 이름이 나올 수 있어서
				//       'className'과 일치하지 않을 수 있다.

				const Class = module[className] || module.default;

				if (Class && typeof Class === 'function' && Class.prototype) {
					resolve(Class);
				} else {
					reject(
						new Error(
							`Class ${className} not found or is not a valid class in module ${modulePath}`
						)
					);
				}
			})
			.catch((error) => {
				console.error(`Failed to load class ${className} from module ${modulePath}:`, error);
				reject(error);
			});
	});
}

export function deepCopy<T>(obj: T): T {
	if (typeof structuredClone === 'function') {
		// structuredClone이 지원되는 경우 (ECMAScript 2022부터 도입)
		return structuredClone(obj);
	} else {
		// structuredClone이 지원되지 않는 경우
		try {
			return JSON.parse(JSON.stringify(obj));
		} catch (error) {
			console.warn('깊은 복사 중 오류 발생:', error);
			return obj; // 복사 실패 시 원본 객체 반환
		}
	}
}

export function cLog(...args: any[]): void {
	const processedArgs = args.map((arg) =>
		typeof arg === 'object' && arg !== null ? deepCopy(arg) : arg
	);
	console.log(...processedArgs);
}

export function diffObj(obj1: any, obj2: any, isRoot: boolean = true): any {
	if (obj1 === obj2) return isRoot ? {} : undefined;

	if (Array.isArray(obj1) && Array.isArray(obj2)) {
		const result: any[] = [];
		for (let i = 0; i < Math.max(obj1.length, obj2.length); i++) {
			const diff = diffObj(obj1[i], obj2[i], false);
			if (diff !== undefined) {
				result[i] = diff;
			}
		}
		return result.length > 0 ? result : undefined;
	}

	if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
		return `${formatValue(obj1)} => ${formatValue(obj2)}`;
	}

	const result: { [key: string]: any } = {};
	const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

	for (const key of keys) {
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

		if (!(key in obj1)) {
			result[key] = `undefined => ${formatValue(obj2[key])}`;
		} else if (!(key in obj2)) {
			result[key] = `${formatValue(obj1[key])} => undefined`;
		} else {
			const diff = diffObj(obj1[key], obj2[key], false);
			if (diff !== undefined) {
				result[key] = diff;
			}
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

export function cDiffObj(obj1: any, obj2: any, message: string = ''): void {
	const diff = compareObjects(obj1, obj2);
	if (diff !== undefined) {
		console.log(message);
		console.log(JSON.stringify(diff, null, 2));
	}
}

function compareObjects(obj1: any, obj2: any): any {
	if (obj1 === obj2) return undefined;

	if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
		return `${formatValue(obj1)} => ${formatValue(obj2)}`;
	}

	if (Array.isArray(obj1) && Array.isArray(obj2)) {
		return compareArrays(obj1, obj2);
	}

	const result: { [key: string]: any } = {};
	const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

	for (const key of keys) {
		if (!(key in obj2)) {
			result[key] = `${formatValue(obj1[key])} => undefined`;
		} else if (!(key in obj1)) {
			result[key] = `undefined => ${formatValue(obj2[key])}`;
		} else {
			const nestedDiff = compareObjects(obj1[key], obj2[key]);
			if (nestedDiff !== undefined) {
				result[key] = nestedDiff;
			}
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

function compareArrays(arr1: any[], arr2: any[]): any {
	const result: { [key: number]: any } = {};
	const maxLength = Math.max(arr1.length, arr2.length);

	for (let i = 0; i < maxLength; i++) {
		if (i >= arr1.length) {
			result[i] = `undefined => ${formatValue(arr2[i])}`;
		} else if (i >= arr2.length) {
			result[i] = `${formatValue(arr1[i])} => undefined`;
		} else {
			const nestedDiff = compareObjects(arr1[i], arr2[i]);
			if (nestedDiff !== undefined) {
				result[i] = nestedDiff;
			}
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

function formatValue(value: any): string {
	if (value === null) {
		return 'null';
	} else if (value === undefined) {
		return 'undefined';
	} else if (typeof value === 'string') {
		return `'${value}'`;
	} else if (Array.isArray(value)) {
		return `[${value.map(formatValue).join(', ')}]`;
	} else if (typeof value === 'object') {
		return '{...}';
	} else {
		return `${typeof value}(${String(value)})`;
	}
}
