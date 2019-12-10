import Joi from '@hapi/joi';
import { DeltaValues } from './delta-types';
import { ModelState } from './base-types';

const Validator_S = Joi.func().arity(1);

interface ValidatorBaseParams {
  isCreate: boolean;
  modifiedState: ModelState;
  postState: ModelState;
  existingState?: ModelState;
  context?: Record<string, any>;
}

interface ValidatorParams extends DeltaValues, ValidatorBaseParams {}

type ValidatorOutcome = boolean | string;
type Validator = (params: ValidatorParams) => ValidatorOutcome;

const DefaultInvalidValueMessage = 'did not pass validation';

export { Validator_S };
export {
  Validator,
  ValidatorBaseParams,
  ValidatorParams,
  ValidatorOutcome,
  DefaultInvalidValueMessage
};
