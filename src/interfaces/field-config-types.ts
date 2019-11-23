import Joi from '@hapi/joi';
import { FieldId, FieldId_S } from './base-types';
import { BaseTypeConfig } from './custom-types';

const IFieldConfig_S = Joi.object({
  fieldId: FieldId_S.required(),
  typeId: Joi.string().optional()
});
interface IFieldConfig extends BaseTypeConfig {
  fieldId: FieldId;
  typeId?: string;
}

export { IFieldConfig_S }
export { IFieldConfig };
