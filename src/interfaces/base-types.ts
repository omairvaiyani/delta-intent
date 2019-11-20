type ModelId = string | number | symbol;
type IntentId = string | number | symbol;
type FieldId = string | number;
type InputValue = any;
type ModelState = Record<FieldId, InputValue>;
enum DefaultValueType {
  Array = "array",
  Boolean = "boolean",
  Date = "date",
  Number = "number",
  Object = "object",
  String = "string",
  Symbol = "symbol"
}

export { ModelId, IntentId, FieldId, InputValue, ModelState, DefaultValueType };
