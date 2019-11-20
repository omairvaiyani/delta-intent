import { FieldId, DefaultValueType } from "./base-types";
import { Sanitizer } from "./sanitizer-types";
import { Validator } from "./validator-types";

interface IFieldConfig {
  fieldId: FieldId;
  type?: DefaultValueType;
  sanitizer?: Sanitizer;
  validator?: Validator;
}

export { IFieldConfig };
