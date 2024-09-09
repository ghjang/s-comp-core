export const removeUnserializableProperties = (
  obj,
  keyPredicate = (key) => true,
  printLog = false,
  keyPath = []
) => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) =>
      removeUnserializableProperties(
        item,
        keyPredicate,
        printLog,
        keyPath.concat(`[${index}]`)
      )
    );
  }

  const plainObject = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "function") {
        if (printLog) {
          const keyPathStr = keyPath
            .concat(key)
            .join(".")
            .replace(/\.\[/g, "[");
          console.log(
            `removing function with key: '${keyPathStr}' and function name: '${value.name}'`
          );
        }

        plainObject[key] = keyPredicate(key) ? `removed: ${value.name}` : null;
      } else {
        if (keyPredicate(key)) {
          if (value === undefined) {
            plainObject[key] = null;
          } else {
            plainObject[key] = removeUnserializableProperties(
              value,
              keyPredicate,
              printLog,
              keyPath.concat(key)
            );
          }
        } else {
          if (Array.isArray(value)) {
            plainObject[key] = [];
          } else if (value === undefined || typeof value === "object") {
            plainObject[key] = null;
          }
        }
      }
    }
  }
  return plainObject;
};

export const restoreUnserializableProperties = async (
  obj,
  scriptBase,
  printLog = false,
  keyPath = []
) => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return Promise.all(
      obj.map((item, index) =>
        restoreUnserializableProperties(
          item,
          scriptBase,
          printLog,
          keyPath.concat(`[${index}]`)
        )
      )
    );
  }

  const restoredObject = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === "string" && value.startsWith("removed: ")) {
        const className = value.replace("removed: ", "");
        const keyPathStr = keyPath.concat(key).join(".").replace(/\.\[/g, "[");

        if (printLog) {
          console.log(
            `restoring function with key: '${keyPathStr}' and class name: '${className}'`
          );
        }

        // NOTE: '배포용 번들링 최적화'시에 'removed: XX'의 'XX' 부분에 'XX' 같이 원래의 '클래스명'이 아닌 '축소된 임의의 클래스명'으로
        //       변환되어 있을 수 있다. 'componentClassName' 속성이 지정되어 있을 경우에 이 속성의 값을 이용하여 모듈 로딩을 먼저 시도한다.
        if (obj.hasOwnProperty("componentClassName")) {
          const componentClassName = obj.componentClassName;
          const _module = await import(
            `${scriptBase}/${componentClassName}.js`
          );
          restoredObject[key] = _module[componentClassName] || _module.default;
        } else {
          const _module = await import(`${scriptBase}/${className}.js`);
          restoredObject[key] = _module[className] || _module.default;
        }
      } else {
        restoredObject[key] = await restoreUnserializableProperties(
          value,
          scriptBase,
          printLog,
          keyPath.concat(key)
        );
      }
    }
  }
  return restoredObject;
};
