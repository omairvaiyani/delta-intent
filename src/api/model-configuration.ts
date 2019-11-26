import Joi from '@hapi/joi';
import { ModelId, ModelId_S } from '../interfaces/base-types';
import {
  IntentConfig,
  IntentConfig_S
} from '../interfaces/intent-config-types';
import { FieldConfig, FieldConfig_S } from '../interfaces/field-config-types';
import { TypeConfig, TypeConfig_S } from '../interfaces/custom-types';
import { TypeConfigStore } from './type-config-store';
import { throwIfInvalidShape, throwIfDuplicates } from '../utils/validator';

class ModelConfiguration {
  public readonly modelId: ModelId;
  public readonly fieldConfigList: FieldConfig[];
  public readonly intentConfigList: IntentConfig[];

  constructor(input: ModelConfiguration.ConstructorParams) {
    throwIfInvalidShape(input, ConstructorParams_S.required());
    throwIfDuplicates(input.fieldConfigList, 'fieldId');
    throwIfDuplicates(input.intentConfigList, 'intentId');
    if (input.typeConfigList) {
      throwIfDuplicates(input.typeConfigList, 'typeId');
    }

    this.modelId = input.modelId;
    this.fieldConfigList = input.fieldConfigList;
    this.intentConfigList = input.intentConfigList;
    this.typeConfigStore = input.typeConfigStore;
    this._typeConfigList = input.typeConfigList;

    // throw after setting up typeConfigList
    this.throwIfUnknownTypesInFields(
      input.fieldConfigList,
      this.typeConfigList
    );
  }

  private throwIfUnknownTypesInFields(
    fieldConfigList: FieldConfig[],
    typeConfigList: TypeConfig[]
  ) {
    const availableTypes = typeConfigList.map(tC => tC.typeId);
    const unknownTypes = fieldConfigList
      .filter(fC => fC.typeId)
      .map(fC => fC.typeId)
      .filter(t => !availableTypes.includes(t));
    if (unknownTypes.length) {
      throw new Error(
        `ModelConfiguration ${
          this.modelId
        } is invalid; your field config list points to unknown types ${JSON.stringify(
          unknownTypes
        )}`
      );
    }
  }

  /**
   * Merges type configs from `typeConfigStore`
   * and model specific `_typeConfigList`. In
   * case of duplicates, `_typeConfigList` type
   * configs are used.
   */
  public get typeConfigList(): TypeConfig[] {
    const { typeConfigStore, _typeConfigList } = this;
    let list: TypeConfig[] = [];
    if (_typeConfigList) {
      list = [..._typeConfigList];
    }
    if (typeConfigStore) {
      typeConfigStore.typeConfigList.forEach(typeConfig => {
        if (!list.find(tC => tC.typeId === typeConfig.typeId)) {
          list.push(typeConfig);
        }
      });
    }
    return list;
  }

  /**
   * Shared types
   */
  private typeConfigStore?: TypeConfigStore;

  /**
   * Model specific types
   */
  private _typeConfigList?: TypeConfig[];
}

const ConstructorParams_S = Joi.object({
  modelId: ModelId_S.required(),
  fieldConfigList: Joi.array()
    .items(FieldConfig_S)
    .min(1)
    .required(),
  intentConfigList: Joi.array()
    .items(IntentConfig_S)
    .min(1)
    .required(),
  typeConfigStore: Joi.object()
    .type(TypeConfigStore)
    .optional(),
  typeConfigList: Joi.array()
    .items(TypeConfig_S)
    .min(1)
    .optional()
});

namespace ModelConfiguration {
  export interface ConstructorParams {
    modelId: ModelId;
    fieldConfigList: FieldConfig[];
    intentConfigList: IntentConfig[];
    typeConfigList?: TypeConfig[];
    typeConfigStore?: TypeConfigStore;
  }
}

export { ModelConfiguration };