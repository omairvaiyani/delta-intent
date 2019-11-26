import 'joi-extract-type';

import { FieldId, IntentId, TypeId } from '../../src/interfaces/base-types';
import { FieldConfig } from '../../src/interfaces/field-config-types';
import { IntentConfig } from '../../src/interfaces/intent-config-types';
import { TypeConfig } from '../../src/interfaces/custom-types';

const getFieldConfig = (fieldId?: FieldId): FieldConfig => ({
  fieldId: fieldId || 'a'
});
const getIntentConfig = (
  intentId?: IntentId,
  fieldIds?: FieldId[]
): IntentConfig => ({
  intentId: intentId || '1',
  isCreate: true,
  matchConfig: {
    items: fieldIds
      ? fieldIds.map(fieldId => ({
          fieldMatch: fieldId,
          deltaMatch: { deltaCheck: true }
        }))
      : [{ fieldMatch: 'a', deltaMatch: { deltaCheck: true } }]
  }
});
const getTypeConfig = (typeId?: TypeId): TypeConfig => ({
  typeId: typeId || 'CustomA',
  objectHasher: a => a
});

export { getFieldConfig, getIntentConfig, getTypeConfig };
