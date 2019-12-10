import { ModelId, IntentId } from '../interfaces/base-types';
import { TypeConfig } from '../interfaces/custom-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { IntentConfig } from '../interfaces/intent-config-types';
import { TypeApi } from './type';
import { FieldApi } from './field';
import { IntentApi } from './intent';
import {
  GetIntentionsInput,
  GetIntentionsOptions
} from '../interfaces/get-intentions-types';
import { getIntentions } from '../core/get-intentions';
import { ModelConfiguration } from '../core/model-configuration';

export class ModelApi {
  private modelId: ModelId;
  private typeConfigList: TypeConfig[];
  private fieldConfigList: FieldConfig[];
  private intentConfigList: IntentConfig[];

  constructor(modelId: ModelId) {
    this.modelId = modelId;
  }
  public types(types: TypeApi[]) {
    if (this.typeConfigList) {
      throw new Error('You have already set the types, add them all at once');
    }
    this.typeConfigList = types.map(type => type.toConfig());
    return this;
  }
  public fields(fields: FieldApi[]) {
    if (this.fieldConfigList) {
      throw new Error('You have already set the fields, add them all at once');
    }
    this.fieldConfigList = fields.map(field => field.toConfig());
    return this;
  }
  public intentions(intentions: IntentApi[]) {
    if (this.intentConfigList) {
      throw new Error(
        'You have already set the intentions, add them all at once'
      );
    }
    this.intentConfigList = intentions.map(intent => intent.toConfig());
    return this;
  }

  public getIntentions(
    input: GetIntentionsInput,
    options?: GetIntentionsOptions
  ) {
    const outcome = getIntentions(this.toConfig(), input, options);
    return {
      ...outcome,
      isIntent(intentId: IntentId): boolean {
        return outcome.intentIds.includes(intentId);
      }
    };
  }

  private toConfig(): ModelConfiguration {
    // TODO, any need to keep ModelConfiguration class over the json?
    return new ModelConfiguration({
      modelId: this.modelId,
      fieldConfigList: this.fieldConfigList,
      typeConfigList: this.typeConfigList,
      intentConfigList: this.intentConfigList
    });
  }
}
