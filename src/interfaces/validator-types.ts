import Joi from '@hapi/joi';
import { DeltaValues } from './delta-types';

const Validator_S = Joi.func().arity(1);

interface ValidatorParams extends DeltaValues {
  isCreate: boolean;
}
type ValidatorOutcome = boolean | string;
type Validator = (params: ValidatorParams) => ValidatorOutcome;

const DefaultInvalidValueMessage = 'did not pass validation';

export { Validator_S };
export {
  Validator,
  ValidatorParams,
  ValidatorOutcome,
  DefaultInvalidValueMessage
};
