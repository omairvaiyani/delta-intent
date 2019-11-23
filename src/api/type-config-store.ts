import Joi from '@hapi/joi';
import { ITypeConfig, ITypeConfig_S } from '../interfaces/custom-types';
import { throwIfInvalidShape, throwIfDuplicates } from '../utils/validator';
import { TypeId, TypeId_S } from '../interfaces/base-types';

class TypeConfigStore {
  public readonly typeConfigList: ITypeConfig[];

  constructor(input: { typeConfigList: ITypeConfig[] }) {
    throwIfInvalidShape(
      input.typeConfigList,
      Joi.array()
        .items(ITypeConfig_S)
        .min(1)
        .required()
    );
    throwIfDuplicates(input.typeConfigList, 'typeId');

    this.typeConfigList = input.typeConfigList;
  }

  public getTypeConfig(typeId: TypeId): ITypeConfig {
    throwIfInvalidShape(typeId, TypeId_S.required());
    return this.typeConfigList.find(c => c.typeId === typeId);
  }
}

export { TypeConfigStore };
