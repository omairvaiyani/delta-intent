import Joi from '@hapi/joi';
import { Sanitizer, Sanitizer_S } from './sanitizer-types';
import { Validator, Validator_S } from './validator-types';
import { ObjectHasher, ObjectHasher_S } from './hasher-types';
import { DeltaChecker, DeltaChecker_S } from './match-config-types';
import { TypeId, TypeId_S } from './base-types';

const _BaseTypeConfig_S = {
  deltaChecker: DeltaChecker_S.optional(),
  sanitizer: Sanitizer_S.optional(),
  validator: Validator_S.optional(),
  objectHasher: ObjectHasher_S.optional()
};
const BaseTypeConfig_S = Joi.object(_BaseTypeConfig_S);
interface BaseTypeConfig {
  deltaChecker?: DeltaChecker;
  sanitizer?: Sanitizer;
  validator?: Validator;
  objectHasher?: ObjectHasher;
}

const ITypeConfig_S = Joi.object({
  ..._BaseTypeConfig_S,
  typeId: TypeId_S.required()
});
interface ITypeConfig extends BaseTypeConfig {
  typeId: TypeId;
}

export { BaseTypeConfig_S, ITypeConfig_S };
export { BaseTypeConfig, ITypeConfig };
