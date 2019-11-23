import Joi from '@hapi/joi';
import { InputValue, InputValue_S } from './base-types';
import { ObjectHasher, ObjectHasher_S } from './hasher-types';

const DeltaValues_S = Joi.object({
  existingValue: InputValue_S.optional(),
  modifiedValue: InputValue_S.required()
});
interface DeltaValues {
  existingValue?: InputValue;
  modifiedValue: InputValue;
}

const DifferOptions_S = Joi.object({
  objectHasher: ObjectHasher_S.optional()
});
interface DifferOptions {
  objectHasher?: ObjectHasher;
}

const Delta_S = Joi.any().invalid(false, true, null, 0);
type Delta =
  | [any]
  | [any, any]
  | { [key: string]: any; [key: number]: any }
  | undefined;

export { DeltaValues_S, DifferOptions_S, Delta_S };
export { DeltaValues, Delta, DifferOptions };
