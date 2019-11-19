import { InputValue } from "./base-types";
import { DeltaValues } from "./delta-types";

interface SanitizerOutcome {
  didSanitize: boolean;
  sanitizedValue: InputValue;
}

type Sanitizer = (values: DeltaValues) => SanitizerOutcome;

export { Sanitizer };
