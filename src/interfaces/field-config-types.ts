import { FieldId } from "./base-types";
import { Sanitizer } from "./sanitizer-types";
import { Validator } from "./validator-types";

interface IFieldConfig {
  fieldId: FieldId;
  type?:
    | "array"
    | "boolean"
    | "date"
    | "number"
    | "object"
    | "string"
    | "symbol"
    | string;
  sanitizer?: Sanitizer;
  validator?: Validator;
}

export { IFieldConfig };
