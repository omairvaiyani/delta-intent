import 'joi-extract-type';
import { ModelConfiguration } from './core/model-configuration';
import { TypeConfigStore } from './core/type-config-store';
import { getIntentions } from './core/get-intentions';

import { ErrorCode as _ErrorCode } from './interfaces/error-types';
import { FieldConfig as _FieldConfig } from './interfaces/field-config-types';
import { IntentConfig as _IntentConfig } from './interfaces/intent-config-types';
import { TypeConfig as _TypeConfig } from './interfaces/custom-types';
import { Validator as _Validator } from './interfaces/validator-types';
import { Sanitiser as _Sanitiser } from './interfaces/sanitiser-types';
import {
  DeltaChecker as _DeltaChecker,
  FieldDeltaOutcome as _FieldDeltaOutcome
} from './interfaces/match-config-types';

namespace DIInterface {
  export interface FieldConfig extends _FieldConfig {}
  export interface IntentConfig extends _IntentConfig {}
  export interface TypeConfig extends _TypeConfig {}
  export type Validator = _Validator;
  export type Sanitiser = _Sanitiser;
  export type DeltaChecker = _DeltaChecker;

  // enums
  export const ErrorCode = _ErrorCode;

  // outputs
  export interface FieldDeltaOutcome extends _FieldDeltaOutcome {}
}

export { ModelConfiguration, TypeConfigStore, getIntentions, DIInterface };
