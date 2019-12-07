import Joi from '@hapi/joi';
import { TypeConfig, TypeConfig_S } from '../interfaces/custom-types';
import { throwIfInvalidShape, throwIfDuplicates } from '../utils/validator';
import { TypeId, TypeId_S } from '../interfaces/base-types';

class TypeConfigStore {
  public readonly typeConfigList: TypeConfig[];

  constructor(input: { typeConfigList: TypeConfig[] }) {
    throwIfInvalidShape(
      input.typeConfigList,
      Joi.array()
        .items(TypeConfig_S)
        .min(1)
        .required()
    );
    throwIfDuplicates(input.typeConfigList, 'typeId');

    this.typeConfigList = input.typeConfigList;
  }

  public getTypeConfig(typeId: TypeId): TypeConfig {
    throwIfInvalidShape(typeId, TypeId_S.required());
    return this.typeConfigList.find(c => c.typeId === typeId);
  }
}

export { TypeConfigStore };
