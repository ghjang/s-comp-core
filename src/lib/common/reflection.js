export function defaultEnumValue(enumObj) {
  const keys = Object.keys(enumObj);
  if (keys.length > 0) {
    return enumObj[keys[0]];
  }
  return null;
}

export function findSymbolByDescription(enumObj, description) {
  for (let key in enumObj) {
    if (enumObj[key].description === description) {
      return enumObj[key];
    }
  }
  return null;
}
