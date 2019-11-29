import 'joi-extract-type';
import { ModelConfiguration } from './api/model-configuration';
import { TypeConfigStore } from './api/type-config-store';
import { getIntentions } from './api/get-intentions';

import { FieldConfig as _FieldConfig } from './interfaces/field-config-types';
import { IntentConfig as _IntentConfig } from './interfaces/intent-config-types';
import { TypeConfig as _TypeConfig } from './interfaces/custom-types';
import { Validator as _Validator } from './interfaces/validator-types';

namespace DIInterface {
  export interface FieldConfig extends _FieldConfig {}
  export interface IntentConfig extends _IntentConfig {}
  export interface TypeConfig extends _TypeConfig {}

  export type Validator = _Validator;
}

export { ModelConfiguration, TypeConfigStore, getIntentions, DIInterface };
