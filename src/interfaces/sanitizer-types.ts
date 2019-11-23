import Joi from '@hapi/joi';
import { InputValue, InputValue_S } from './base-types';
import { DeltaValues } from './delta-types';

const SanitizerOutcome_S = Joi.object({
  didSanitize: Joi.boolean().required(),
  sanitizedValue: InputValue_S.optional()
});

interface SanitizerOutcome extends Joi.extractType<typeof SanitizerOutcome_S> {
  sanitizedValue: InputValue;
}

const Sanitizer_S = Joi.func().arity(1);
type Sanitizer = (values: DeltaValues) => SanitizerOutcome;

export { SanitizerOutcome_S, Sanitizer_S };
export { Sanitizer, SanitizerOutcome };
