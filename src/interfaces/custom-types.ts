import Joi from '@hapi/joi';
import { Validator, Validator_S } from './validator-types';
import { ObjectHasher, ObjectHasher_S } from './hasher-types';
import { DeltaChecker, DeltaChecker_S } from './match-config-types';
import { TypeId, TypeId_S } from './base-types';
import { Sanitiser_S, Sanitiser } from './sanitiser-types';

const _BaseTypeConfig_S = {
  deltaChecker: DeltaChecker_S.optional(),
  sanitiser: Sanitiser_S.optional(),
  validator: Joi.alternatives()
    .try(
      Validator_S,
      Joi.array()
        .items(Validator_S)
        .min(1)
    )
    .optional(),
  objectHasher: ObjectHasher_S.optional(),
  isRequired: Joi.boolean().optional()
};
const BaseTypeConfig_S = Joi.object(_BaseTypeConfig_S);
interface BaseTypeConfig {
  deltaChecker?: DeltaChecker;
  sanitiser?: Sanitiser;
  validator?: Validator | Validator[];
  objectHasher?: ObjectHasher;
  isRequired?: boolean;
}

const TypeConfig_S = Joi.object({
  ..._BaseTypeConfig_S,
  typeId: TypeId_S.required()
});
interface TypeConfig extends BaseTypeConfig {
  typeId: TypeId;
}

export { _BaseTypeConfig_S, BaseTypeConfig_S, TypeConfig_S };
export { BaseTypeConfig, TypeConfig };
