import Joi from '@hapi/joi';
import { FieldId, FieldId_S } from './base-types';
import { BaseTypeConfig, _BaseTypeConfig_S } from './custom-types';

const FieldConfig_S = Joi.object({
  fieldId: FieldId_S.required(),
  typeId: Joi.string().optional(),
  isArray: Joi.boolean().optional(),
  ..._BaseTypeConfig_S
});
interface FieldConfig extends BaseTypeConfig {
  fieldId: FieldId;
  typeId?: string;
  isArray?: boolean;
}

export { FieldConfig_S };
export { FieldConfig };
