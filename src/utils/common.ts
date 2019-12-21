const hasProperty = function<T>(obj: T, key: keyof T): boolean {
  return Object.hasOwnProperty.call(obj, key);
};

const enumValues = function(_e: any): any[] {
  return Object.values(_e);
};

const safeId = function(id: symbol | string | number) {
  return String(id);
};

export { hasProperty, enumValues, safeId };
