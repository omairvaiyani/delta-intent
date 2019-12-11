import Joi from '@hapi/joi';
import { DeltaValues } from './delta-types';
import { ModelState, InputValue } from './base-types';

const Validator_S = Joi.func().arity(1);

interface ValidatorBaseParams {
  isCreate: boolean;
  modifiedState: ModelState;
  postState: ModelState;
  existingState?: ModelState;
  context?: Record<string, any>;
}

interface ValidatorParams<T extends InputValue = InputValue>
  extends DeltaValues<T>,
    ValidatorBaseParams {}

type ValidatorOutcome = boolean | string;
type Validator<T extends InputValue = InputValue> = (
  params: ValidatorParams<T>
) => ValidatorOutcome;

const DefaultInvalidValueMessage = 'did not pass validation';

export { Validator_S };
export {
  Validator,
  ValidatorBaseParams,
  ValidatorParams,
  ValidatorOutcome,
  DefaultInvalidValueMessage
};
