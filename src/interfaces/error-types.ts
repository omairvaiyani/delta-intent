import { FieldId, InputValue } from './base-types';

interface IDeltaError {
  code: string;
  message: string;
  info?: any;
}

interface InvalidFieldValue {
  fieldId: FieldId;
  value: InputValue;
  reason: string | string[];
}

export { IDeltaError, InvalidFieldValue };
