import Joi from '@hapi/joi';
import { InputValue, InputValue_S } from './base-types';
import { DeltaValues } from './delta-types';

const SanitiserOutcome_S = Joi.object({
  didSanitise: Joi.boolean().required(),
  sanitisedValue: InputValue_S.optional()
});

interface SanitiserOutcome {
  didSanitise: boolean;
  sanitisedValue?: InputValue;
}

const Sanitiser_S = Joi.func().arity(1);
type Sanitiser = (values: DeltaValues) => SanitiserOutcome;

export { SanitiserOutcome_S, Sanitiser_S };
export { Sanitiser, SanitiserOutcome };
