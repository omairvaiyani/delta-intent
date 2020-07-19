import Joi from '@hapi/joi';
import { InputValue, InputValue_S } from './base-types';
import { InputPipeParams } from './input-pipe-types';

type SanitiserParams<T extends InputValue = InputValue> = InputPipeParams<T>

const SanitiserOutcome_S = Joi.object({
  didSanitise: Joi.boolean().required(),
  sanitisedValue: InputValue_S.optional()
});

interface SanitiserOutcome {
  didSanitise: boolean;
  sanitisedValue?: InputValue;
}

const Sanitiser_S = Joi.func().arity(1);
type Sanitiser<T extends InputValue = InputValue> = (
  params: SanitiserParams<T>
) => SanitiserOutcome;

export { SanitiserOutcome_S, Sanitiser_S };
export { Sanitiser, SanitiserParams, SanitiserOutcome };
