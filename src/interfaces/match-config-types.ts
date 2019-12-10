import Joi from '@hapi/joi';
import { FieldId, InputValue, FieldId_S, InputValue_S } from './base-types';
import { DeltaValues, Delta, Delta_S } from './delta-types';
import { DifferOptions } from '../utils/diff';
import { enumValues } from '../utils/common';

const FieldMatch_S = Joi.alternatives().try([
  FieldId_S,
  Joi.array()
    .items(
      Joi.alternatives().try([
        FieldId_S,
        Joi.array()
          .items(FieldId_S)
          .min(1)
      ])
    )
    .min(1)
]);
type FieldMatch = FieldId | Array<FieldId | FieldId[]>;

const DeltaChecker_S = Joi.func()
  .minArity(1)
  .maxArity(2);

type DeltaChecker<T extends InputValue = InputValue> = (
  deltaValues: DeltaValues<T>,
  options?: { differOptions?: DifferOptions }
) => Delta;

const ManualMatcher_S = Joi.func().arity(1);

type ManualMatcher<T extends InputValue = InputValue> = (
  values: DeltaValues<T>
) => boolean;

enum ValueMatchPresence {
  Optional = 'optional',
  Required = 'required',
  Forbidden = 'forbidden'
}

const ValueMatch_S = Joi.object({
  presence: Joi.string()
    .valid(enumValues(ValueMatchPresence))
    .optional(),
  value: InputValue_S.optional(),
  manual: ManualMatcher_S.optional()
});
interface ValueMatch {
  presence?: ValueMatchPresence;
  value?: InputValue;
  manual?: ManualMatcher;
}

const DeltaCheckConfig_S = Joi.object({
  arrayChanges: Joi.object({
    added: Joi.alternatives()
      .try([Joi.boolean(), Joi.number()])
      .optional(),
    removed: Joi.alternatives()
      .try([Joi.boolean(), Joi.number()])
      .optional(),
    moved: Joi.alternatives()
      .try([Joi.boolean(), Joi.number()])
      .optional()
  })
});
interface DeltaCheckConfig {
  arrayChanges?: {
    added?: boolean | number;
    removed?: boolean | number;
    moved?: boolean | number;
  };
}

const DeltaCheck_S = Joi.alternatives().try([
  Joi.boolean(),
  DeltaCheckConfig_S,
  DeltaChecker_S
]);

type DeltaCheck = boolean | DeltaCheckConfig | DeltaChecker;

const DeltaMatch_S = Joi.object({
  existingState: ValueMatch_S.optional(),
  modifiedState: ValueMatch_S.optional(),
  deltaCheck: DeltaCheck_S.optional()
}).min(1);
interface DeltaMatch {
  existingState?: ValueMatch;
  modifiedState?: ValueMatch;
  deltaCheck?: DeltaCheck;
}

const MatchConfigItem_S = Joi.object({
  fieldMatch: FieldMatch_S.required(),
  deltaMatch: DeltaMatch_S.required()
});
interface MatchConfigItem {
  fieldMatch: FieldMatch;
  deltaMatch: DeltaMatch;
}

const MatchConfig_S = Joi.object({
  items: Joi.array()
    .items(MatchConfigItem_S)
    .min(1)
    .required()
});
interface MatchConfig {
  items: MatchConfigItem[];
}

const ArrayDeltaItem_S = Joi.alternatives([
  Joi.string(),
  Joi.array().items(Joi.any(), Joi.number()),
  Joi.array().items(Joi.any(), Joi.number(), Joi.number())
]);
const ArrayDelta_S = Joi.object({
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
interface ArrayDelta {
  added: Array<[any, number] | string>;
  removed: Array<[any, number] | string>;
  moved: Array<[any, number, number]>;
}

const FieldDeltaOutcome_S = Joi.object({
  fieldId: FieldId_S.required(),
  didMatch: Joi.boolean().required(),
  delta: Delta_S.optional(),
  arrayDelta: ArrayDelta_S.optional()
});
interface FieldDeltaOutcome {
  fieldId: FieldId;
  didMatch: boolean;
  delta?: Delta;
  arrayDelta?: ArrayDelta;
}

export {
  FieldMatch_S,
  DeltaChecker_S,
  DeltaCheck_S,
  DeltaMatch_S,
  MatchConfigItem_S,
  MatchConfig_S,
  ArrayDelta_S,
  FieldDeltaOutcome_S,
  ManualMatcher_S
};
export {
  FieldMatch,
  ValueMatch,
  ValueMatchPresence,
  DeltaMatch,
  MatchConfig,
  MatchConfigItem,
  DeltaCheckConfig,
  DeltaChecker,
  DeltaCheck,
  ArrayDelta,
  FieldDeltaOutcome,
  ManualMatcher
};
