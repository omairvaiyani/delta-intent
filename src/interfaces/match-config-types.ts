import Joi from '@hapi/joi';
import { FieldId, InputValue, FieldId_S, InputValue_S } from './base-types';
import { DeltaValues, Diff } from './delta-types';
import { DifferOptions } from '../utils/diff';
import { enumValues } from '../utils/common';
import { FieldDeltaData } from './get-intentions-types';
import { InputPipeParams } from './input-pipe-types';

const FieldMatch_S = Joi.alternatives().try(
  FieldId_S,
  Joi.array()
    .items(
      Joi.alternatives().try(
        FieldId_S,
        Joi.array()
          .items(FieldId_S)
          .min(1)
      )
    )
    .min(1)
);
type FieldMatch = FieldId | Array<FieldId | FieldId[]>;

const DeltaChecker_S = Joi.func()
  .minArity(1)
  .maxArity(2);

type DeltaChecker<T extends InputValue = InputValue> = (
  deltaValues: DeltaValues<T>,
  options?: { differOptions?: DifferOptions }
) => Diff;

interface ManualMatcherParams<T extends InputValue = InputValue>
  extends InputPipeParams<T> {}

const ManualMatcher_S = Joi.func().arity(1);

type ManualMatcher<T extends InputValue = InputValue> = (
  params: ManualMatcherParams<T>
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
      .try(Joi.boolean(), Joi.number())
      .optional(),
    removed: Joi.alternatives()
      .try(Joi.boolean(), Joi.number())
      .optional(),
    moved: Joi.alternatives()
      .try(Joi.boolean(), Joi.number())
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

const DeltaCheck_S = Joi.alternatives().try(
  Joi.boolean(),
  DeltaCheckConfig_S,
  DeltaChecker_S
);

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

const FieldDeltaOutcome_S = Joi.object({
  fieldId: FieldId_S.required(),
  didMatch: Joi.boolean().required(),
  deltaData: Joi.object({
    fieldId: Joi.string().required(),
    didChange: Joi.boolean().required(),
    delta: Joi.any(),
    arrayDelta: Joi.any()
  })
});
interface FieldDeltaOutcome {
  fieldId: FieldId;
  didMatch: boolean;
  deltaData: FieldDeltaData;
}

interface GroupedFDOList {
  every: FieldDeltaOutcome[];
  some: Array<FieldDeltaOutcome[]>;
}

export {
  FieldMatch_S,
  DeltaChecker_S,
  DeltaCheck_S,
  DeltaMatch_S,
  MatchConfigItem_S,
  MatchConfig_S,
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
  FieldDeltaOutcome,
  GroupedFDOList,
  ManualMatcher,
  ManualMatcherParams
};
