import Joi from '@hapi/joi';
import { InputValue, InputValue_S } from './base-types';
import { ObjectHasher, ObjectHasher_S } from './hasher-types';

const DeltaValues_S = Joi.object({
  existingValue: InputValue_S.optional(),
  modifiedValue: InputValue_S.required()
});

interface DeltaValues<T extends InputValue = InputValue> {
  existingValue?: T;
  modifiedValue: T;
}

const DifferOptions_S = Joi.object({
  objectHasher: ObjectHasher_S.optional()
});
interface DifferOptions {
  objectHasher?: ObjectHasher;
}

const Diff_S = Joi.any().invalid(false, true, null, 0);

type Diff =
  | [any]
  | [any, any]
  | { [key: string]: any; [key: number]: any }
  | undefined;

const ArrayDeltaItem_S = Joi.alternatives([
  Joi.array().items(Joi.any(), Joi.number()),
  Joi.array().items(Joi.any(), Joi.number(), Joi.number())
]);
const ArrayDiff_S = Joi.object({
  added: Joi.array()
    .items(ArrayDeltaItem_S)
    .required(),
  removed: Joi.array()
    .items(ArrayDeltaItem_S)
    .required(),
  moved: Joi.array()
    .items(ArrayDeltaItem_S)
    .required()
});
interface ArrayDelta<T extends InputValue = InputValue> {
  added: Array<[T, number]>;
  removed: Array<[T, number]>;
  moved: Array<[T, number, number]>;
}

interface DeltaData<T extends InputValue = InputValue> {
  didChange: boolean;
  diff: Diff;
  delta: Delta<T>;
  arrayDelta?: ArrayDelta;
}

type Delta<T extends InputValue = InputValue> = [T, T];

export { DeltaValues_S, DifferOptions_S, Diff_S, ArrayDiff_S };
export { DeltaValues, Diff, DifferOptions, Delta, DeltaData, ArrayDelta };
