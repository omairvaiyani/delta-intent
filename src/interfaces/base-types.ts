type ModelId = string | number | symbol;
type IntentId = string | number | symbol;
type FieldId = string | number;
type InputValue = any;
type ModelState = Record<FieldId, InputValue>;

export { ModelId, IntentId, FieldId, InputValue, ModelState };
