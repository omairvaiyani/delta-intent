import {
  ModelId,
  TypeId,
  IntentId,
  FieldId,
  InputValue
} from '../interfaces/base-types';
import { TypeApi } from './type';
import { FieldApi } from './field';
import { IntentApi } from './intent';
import {
  ValueMatchPresence,
  FieldMatch,
  ManualMatcher as _ManualMatcher
} from '../interfaces/match-config-types';
import { MatchApi } from './match';
import { ModelApi } from './model';
import { FieldConfig as _FieldConfig } from '../interfaces/field-config-types';
import { IntentConfig as _IntentConfig } from '../interfaces/intent-config-types';
import { TypeConfig as _TypeConfig } from '../interfaces/custom-types';
import { Validator as _Validator } from '../interfaces/validator-types';
import { Sanitiser as _Sanitiser } from '../interfaces/sanitiser-types';
import {
  DeltaChecker as _DeltaChecker,
  FieldDeltaOutcome as _FieldDeltaOutcome
} from '../interfaces/match-config-types';
import { ErrorCode as _ErrorCode } from '../core/errors';
import { ObjectHasher as _ObjectHasher } from '../interfaces/hasher-types';

namespace Di {
  export const model = (modelId: ModelId) => new ModelApi(modelId);
  export const type = (typeId: TypeId) => new TypeApi(typeId);
  export const field = (fieldId: FieldId) => new FieldApi(fieldId);
  export const intent = (intentId: IntentId) => new IntentApi(intentId);
  export const match = <T extends InputValue>(fieldId?: FieldId | FieldMatch) =>
    new MatchApi<T>(fieldId);

  export const Match = {
    AnyField: (fieldIds: FieldId[]) => fieldIds.map(fieldId => [fieldId]),
    Presence: ValueMatchPresence
  };

  export const ErrorCode = _ErrorCode;

  export namespace Interface {
    export type Validator = _Validator;
    export type Sanitiser = _Sanitiser;
    export type DeltaChecker = _DeltaChecker;
    export type Hasher = _ObjectHasher;
    export type Matcher<T extends InputValue = InputValue> = _ManualMatcher<T>;
    export interface FieldDeltaOutcome extends _FieldDeltaOutcome {}
    export interface Model extends ModelApi {}
  }
}

export { Di };
