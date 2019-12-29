import { InputValue, ModelState } from './base-types';
import { DeltaValues } from './delta-types';

interface BaseInputPipeParams {
  isCreate: boolean;
  modifiedState: ModelState;
  postState: ModelState;
  existingState?: ModelState;
  context?: Record<string, any>;
}

interface InputPipeParams<T extends InputValue = InputValue>
  extends DeltaValues<T>,
    BaseInputPipeParams {}

export { BaseInputPipeParams, InputPipeParams };
