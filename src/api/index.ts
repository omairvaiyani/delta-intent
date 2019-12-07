import { ModelId, TypeId } from '../interfaces/base-types';
import { Validator } from '../interfaces/validator-types';
import { Sanitiser } from '../interfaces/sanitiser-types';
import { ObjectHasher } from '../interfaces/hasher-types';
import { TypeConfig } from '../interfaces/custom-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { TypeApi } from './type';
import { IntentConfig } from '../interfaces/intent-config-types';

class ModelApi {
  private modelId: ModelId;
  private typeConfigList: TypeConfig[];
  private fieldConfigList: FieldConfig[];
  private intentConfigList: IntentConfig[];

  constructor(modelId: ModelId) {
    this.modelId = modelId;
  }
  types(types: TypeApi[]) {
    if (this.typeConfigList) {
      throw new Error('You have already set the types, add them all at once');
    }
    this.typeConfigList = types.map(type => type.toConfig());
    return this;
  }
  fields(fields: FieldApi[]) {
    if (this.fieldConfigList) {
      throw new Error('You have already set the fields, add them all at once');
    }
    this.fieldConfigList = field.map(field => field.toConfig());
    return this;
  }
  intentions(intentions: IntentApi[]) {
    if (this.intentConfigList) {
      throw new Error(
        'You have already set the intentions, add them all at once'
      );
    }
    this.intentConfigList = intentions.map(intent => intent.toConfig());
    return this;
  }
}

const Di = {
  model: (modelId: ModelId) => new ModelApi(modelId),
  type: (typeId: TypeId) => new TypeApi(typeId)
};

export { Di };
