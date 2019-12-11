import Joi from '@hapi/joi';
import {
  ModelState_S,
  ModelState,
  IntentId_S,
  IntentId,
  FieldId,
  ModelId
} from './base-types';
import {
  FieldDeltaOutcome_S,
  FieldDeltaOutcome,
  MatchConfigItem,
  GroupedFDOList,
  ArrayDelta
} from './match-config-types';
import { BaseTypeConfig } from './custom-types';
import { FieldConfig } from './field-config-types';
import { DeltaValues, Delta } from './delta-types';
import { InvalidFieldValue } from './error-types';
import { IntentConfig } from './intent-config-types';

const GetIntentionsInput_S = Joi.object({
  modifiedState: ModelState_S.required(),
  existingState: ModelState_S.optional(),
  context: Joi.object()
    .unknown(true)
    .optional()
});
interface GetIntentionsInput {
  modifiedState: ModelState;
  existingState?: ModelState;
  context?: Record<string, any>;
}

interface GetIntentionsOptions {
  skipValidation?: boolean;
  debug?: boolean;
  verbose?: boolean;
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
  intentIds?: IntentId[];
  fieldDeltaOutcomeList?: FieldDeltaOutcome[];
  sanitisations?: ModelState;
  error?: GetIntentionsError;
  isIntent?: (intentId: IntentId) => boolean;
  fieldDelta?: (fieldId: FieldId) => FieldDeltaData;
}

interface GetIntentionsError {
  modelId: ModelId;
  code: string;
  message: string;
  invalidFields?: InvalidFieldValue[];
  info?: Record<string, any>;
}

interface FieldModificationData {
  fieldId: FieldId;
  fieldConfig: FieldConfig;
  typeConfig: BaseTypeConfig;
  isArray: boolean;
  isRequired: boolean;
  isImmutable: boolean;
  isInModifiedState: boolean;
  rawValues: {
    modified?: any;
    sanitised?: any;
    existing?: any;
  };
  deltaData: FieldDeltaData;
  // only present if modified
  deltaValues?: DeltaValues;
}

interface FieldDeltaData {
  fieldId: FieldId;
  didChange: boolean;
  delta: Delta;
  arrayDelta?: ArrayDelta;
}

interface FieldWithTypeConfigMap {
  fieldConfig: FieldConfig;
  typeConfig: BaseTypeConfig;
}

interface IntentFieldData {
  intentConfig: IntentConfig;
  acceptableFMDList: FieldModificationData[];
  optionalFMDList: FieldModificationData[];
  matchConfigItemDataList: MatchConfigItemData[];
}

interface MatchConfigItemData {
  matchConfigItem: MatchConfigItem;
  matchedFMDList: FieldModificationData[];
  flatFDOList: FieldDeltaOutcome[];
  groupedFDOList: GroupedFDOList;
}

export { GetIntentionsInput_S, GetIntentionsResponse_S };
export {
  GetIntentionsInput,
  GetIntentionsOptions,
  GetIntentionsResponse,
  GetIntentionsError,
  FieldModificationData,
  FieldDeltaData,
  FieldWithTypeConfigMap,
  MatchConfigItemData,
  IntentFieldData
};
