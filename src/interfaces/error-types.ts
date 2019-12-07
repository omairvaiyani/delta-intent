import { FieldId, InputValue } from './base-types';

enum ErrorCode {
  InvalidConfiguration = 'InvalidConfiguration',
  InvalidModifiedState = 'InvalidModifiedState',
  UnknownError = 'UnknownError'
}

interface IDeltaError {
  code: ErrorCode;
  message: string;
  info?: any;
}

interface InvalidFieldValue {
  fieldId: FieldId;
  value: InputValue;
  reason: string | string[];
}

export { ErrorCode, IDeltaError, InvalidFieldValue };
