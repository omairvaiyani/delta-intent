import Joi from '@hapi/joi';
import { InputValue } from './base-types';
import { InputPipeParams } from './input-pipe-types';

const Validator_S = Joi.func().arity(1);

type ValidatorParams<T extends InputValue = InputValue> = InputPipeParams<T>

type ValidatorOutcome = boolean | string;
type Validator<T extends InputValue = InputValue> = (
  params: ValidatorParams<T>
) => ValidatorOutcome;

const DefaultInvalidValueMessage = 'did not pass validation';

export { Validator_S };
export {
  Validator,
  ValidatorParams,
  ValidatorOutcome,
  DefaultInvalidValueMessage
};
