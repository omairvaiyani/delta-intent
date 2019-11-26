import Joi from '@hapi/joi';
import {
  ModelState_S,
  ModelState,
  IntentId_S,
  IntentId,
  FieldId
} from './base-types';
import { FieldDeltaOutcome_S, FieldDeltaOutcome } from './match-config-types';
import { BaseTypeConfig, TypeConfig } from './custom-types';
import { FieldConfig } from './field-config-types';
import { DeltaValues } from './delta-types';

const GetIntentionsInput_S = Joi.object({
  modifiedState: ModelState_S.required(),
  existingState: ModelState_S.optional()
});
interface GetIntentionsInput {
  modifiedState: ModelState;
  existingState?: ModelState;
}

const GetIntentionsResponse_S = Joi.object({
  intentIds: Joi.array()
    .items(IntentId_S)
    .required(),
  fieldDeltaOutcomeList: Joi.array()
    .items(FieldDeltaOutcome_S)
    .required(),
  sanitisations: ModelState_S.optional()
});

interface GetIntentionsResponse {
  intentIds: IntentId[];
  fieldDeltaOutcomeList: FieldDeltaOutcome[];
  sanitisations?: ModelState;
}

interface FieldModificationData {
  fieldId: FieldId;
  fieldConfig: FieldConfig;
  typeConfig: BaseTypeConfig;
  isArray: boolean;
  isInModifiedState: boolean;
  rawValues: {
    modified?: any;
    sanitised?: any;
    existing?: any;
  };
  // only present if modified
  deltaValues?: DeltaValues;
}

interface FieldWithTypeConfigMap {
  fieldConfig: FieldConfig;
  typeConfig: BaseTypeConfig;
}

export { GetIntentionsInput_S, GetIntentionsResponse_S };
export {
  GetIntentionsInput,
  GetIntentionsResponse,
  FieldModificationData,
  FieldWithTypeConfigMap
};