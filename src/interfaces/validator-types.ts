import Joi from '@hapi/joi';
import { DeltaValues } from './delta-types';

const Validator_S = Joi.func().arity(1);
type Validator = (values: DeltaValues) => boolean;

export { Validator_S };
export { Validator };
