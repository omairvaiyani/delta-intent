import Joi from '@hapi/joi';
import { ModelConfiguration } from './model-configuration';
import {
  ModelState,
  IntentId,
  ModelState_S,
  IntentId_S,
  InputValue,
  FieldId
} from '../interfaces/base-types';
import {
  FieldDeltaOutcome,
  FieldMatch,
  DeltaMatch,
  ArrayDelta,
  DeltaCheck,
  DeltaCheckConfig,
  FieldDeltaOutcome_S,
  ValueMatch,
  ValueMatchPresence
} from '../interfaces/match-config-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { DeltaValues, Delta } from '../interfaces/delta-types';
import {
  performCustomDeltaCheck,
  defaultDeltaCheck
} from '../utils/delta-checkers';
import { BaseTypeConfig, TypeConfig } from '../interfaces/custom-types';
import { hasProperty, safeId } from '../utils/common';
import { ErrorCode } from '../interfaces/error-types';
import { DeltaIntentError, throwIfInvalidShape } from '../utils/validator';

const getIntentions = function(
  modelConfiguration: ModelConfiguration,
  input: GetIntentionsInput,
  options?: { skipValidation?: boolean; debug?: boolean; verbose?: boolean }
): GetIntentionsResponse {
  const verbose = (message: any) =>
    options.verbose && console.log(JSON.stringify(message));
  const debug = (message: any) =>
    (options.verbose || options.debug) && console.log(JSON.stringify(message));

  const modelIdSafe = safeId(modelConfiguration.modelId);
  debug(`getIntentions for ${modelIdSafe}`);
  try {
    if (modelConfiguration instanceof ModelConfiguration !== true) {
      throw new DeltaIntentError(
        ErrorCode.InvalidConfiguration,
        'first argument is not an instance of ModelConfiguration'
      );
    }

    throwIfInvalidShape(input, GetIntentionsInput_S);

    const {
      typeConfigList,
      fieldConfigList,
      intentConfigList
    } = modelConfiguration;
    const { existingState, modifiedState } = input;

    const modifiedFieldsToSanitize = fieldConfigList
      .filter(field => field.sanitizer)
      .filter(isFieldModified.bind(null, modifiedState));

    const sanitisedState: ModelState | null = getSanitizedInput(
      modifiedFieldsToSanitize,
      modifiedState,
      existingState
    );

    if (options.skipValidation) {
      verbose('opted to skip validation');
    } else {
      const fieldValidationList = fieldConfigList
        .filter(isFieldModified.bind(null, modifiedState))
        .map(fieldConfig => ({
          fieldId: fieldConfig.fieldId,
          value: getSanitisedModifiedValue(
            fieldConfig.fieldId,
            modifiedState,
            sanitisedState
          ),
          typeConfig: getFieldTypeConfig(typeConfigList, fieldConfig)
        }));
      verbose(`validating ${fieldValidationList.length} modified fields`);
      const invalidFields = getInvalidFields(fieldValidationList);
      if (invalidFields.length) {
        throw new DeltaIntentError(
          ErrorCode.InvalidModifiedState,
          `Modified state contains invalid fields`,
          {
            fieldIds: invalidFields
          }
        );
      }
    }

    const intentIds: IntentId[] = [];
    let fieldDeltaOutcomeList: FieldDeltaOutcome[] = [];

    debug(`input is ${existingState ? `create` : 'update'}`);

    intentConfigList
      .filter(intentConfig =>
        intentConfig.isCreate ? !existingState : existingState
      )
      .forEach(intentConfig => {
        debug(`checking intent: ${safeId(intentConfig.intentId)}`);

        const isIntent = intentConfig.matchConfig.items.every(
          matchConfigItem => {
            const { fieldMatch, deltaMatch } = matchConfigItem;
            debug(`matching ${fieldMatch}`);

            const matchedFieldConfigList = matchFieldsToConfigList(
              fieldMatch,
              fieldConfigList
            );
            verbose(`${matchedFieldConfigList.length} fields to match against`);

            const flatFDOList = matchedFieldConfigList.map(fieldConfig => {
              const { fieldId } = fieldConfig;
              verbose(`${fieldId}: getting delta outcome`);
              const existingValue = existingState
                ? existingState[fieldConfig.fieldId]
                : undefined;

              const sanitisedValue = sanitisedState && sanitisedState[fieldId];
              const modifiedValue = sanitisedValue || modifiedState[fieldId];
              const isInModifiedState = hasProperty(
                modifiedState,
                safeId(fieldId)
              );

              debug({
                fieldId,
                isInModifiedState,
                existingValue,
                sanitisedValue,
                modifiedValue: modifiedState[fieldConfig.fieldId],
                usingSanitisedValue: !!sanitisedValue
              });

              verbose({
                deltaMatch
              });

              const fDO: FieldDeltaOutcome = discernFieldDeltaOutcome(
                typeConfigList,
                fieldConfig,
                deltaMatch,
                {
                  existingValue,
                  modifiedValue
                },
                isInModifiedState
              );

              verbose({ fieldId, deltaOutcome: fDO });
              debug(`${fieldId} ${fDO.didMatch ? 'did' : 'did not'} match`);

              return fDO;
            });
            const groupedFDOList = conditionallyGroupFDOList(
              flatFDOList,
              fieldMatch
            );
            const _AND_fDOMatch = groupedFDOList.every.length
              ? groupedFDOList.every.every(fDO => fDO.didMatch)
              : true;
            const _OR_fDOMatch = groupedFDOList.some.length
              ? groupedFDOList.some.every(fDOGroup =>
                  fDOGroup.some(fDO => fDO.didMatch)
                )
              : true;

            verbose(
              `adding ${flatFDOList.length} field delta outcomes to list`
            );

            fieldDeltaOutcomeList = [...fieldDeltaOutcomeList, ...flatFDOList];

            debug(`match outcome for AND fields: ${_AND_fDOMatch}`);
            debug(`match outcome for OR fields: ${_OR_fDOMatch}`);

            return _AND_fDOMatch && _OR_fDOMatch;
          }
        );
        debug(
          `Intent '${safeId(intentConfig.intentId)}' ${
            isIntent ? 'did' : 'did not'
          } match`
        );

        if (isIntent) {
          intentIds.push(intentConfig.intentId);
          verbose(`total ${intentIds.length} intents matched so far`);
        }
      });

    return {
      intentIds,
      fieldDeltaOutcomeList
    };
  } catch (e) {
    if (e instanceof DeltaIntentError) {
      if (!e.info) {
        e.info = {};
      }
      e.info.modelId = modelIdSafe;
      throw e;
    } else {
      throw new DeltaIntentError(ErrorCode.UnknownError, e.message);
    }
  }
};

const discernFieldDeltaOutcome = function(
  typeConfigList: TypeConfig[],
  fieldConfig: FieldConfig,
  deltaMatch: DeltaMatch,
  deltaValues: DeltaValues,
  isInModifiedState: boolean
): FieldDeltaOutcome {
  const { existingValue, modifiedValue } = deltaValues;
  const { deltaCheck, existingState, modifiedState } = deltaMatch;
  const typeConfig = getFieldTypeConfig(typeConfigList, fieldConfig);

  let didMatch: boolean = false;
  let delta: Delta;
  let arrayDelta: ArrayDelta;

  if (existingState || modifiedState) {
    const [existingStateMatches, modifiedStateMatches] = [
      existingState
        ? doesValueMatchExpected(existingState, existingValue)
        : true,
      doesValueMatchExpected(modifiedState, modifiedValue)
    ];
    didMatch = existingStateMatches && modifiedStateMatches;
  } else if (isInModifiedState && deltaCheck) {
    if (typeof deltaCheck === 'function') {
      delta = performCustomDeltaCheck(deltaValues, deltaCheck);
    } else if (typeConfig.deltaChecker) {
      delta = performCustomDeltaCheck(deltaValues, typeConfig.deltaChecker);
    } else {
      delta = defaultDeltaCheck(deltaValues, {
        differOptions: { objectHasher: typeConfig.objectHasher }
      });
    }

    if (isDeltaForArray(deltaValues)) {
      arrayDelta = generateArrayDelta(deltaValues, delta);
    }

    if (isDeltaCheckConfig(deltaCheck)) {
      if (deltaCheck.arrayChanges) {
        const {
          added: _added,
          removed: _removed,
          moved: _moved
        } = deltaCheck.arrayChanges;
        const { added, removed, moved } = arrayDelta || {
          added: [],
          removed: [],
          moved: []
        };

        const arrayChangeMatched = (_: any) =>
          typeof _[0] === 'boolean'
            ? !!_[1].length === _[0]
            : typeof _[0] === 'number'
            ? _[1].length === _[0]
            : true;

        didMatch = [
          [_added, added],
          [_removed, removed],
          [_moved, moved]
        ].every(arrayChangeMatched);
      }
    } else if (delta) {
      didMatch = true;
    }
  }

  return {
    fieldId: fieldConfig.fieldId,
    didMatch,
    delta,
    arrayDelta
  };
};

const isFieldModified = function(
  modifiedState: ModelState,
  fieldConfig: FieldConfig
): boolean {
  return Object.prototype.hasOwnProperty.call(
    modifiedState,
    fieldConfig.fieldId
  );
};

const getSanitizedInput = function(
  fieldConfigList: FieldConfig[],
  modifiedState: ModelState,
  existingState: ModelState
): ModelState | null {
  const sanitizedState: ModelState = {};
  let didSanitizeAny: boolean;
  fieldConfigList.forEach(fieldConfig => {
    if (fieldConfig.sanitizer) {
      const fieldKey = fieldConfig.fieldId;
      const deltaValues: DeltaValues = {
        modifiedValue: modifiedState[fieldKey]
      };
      if (existingState) {
        deltaValues.existingValue = modifiedState[fieldConfig.fieldId];
      }
      const { didSanitize, sanitizedValue } = fieldConfig.sanitizer(
        deltaValues
      );
      if (didSanitize) {
        sanitizedState[fieldConfig.fieldId] = sanitizedValue;
        didSanitizeAny = true;
      }
    }
  });
  return didSanitizeAny ? sanitizedState : null;
};

/**
 * If a sanitised value is present, returns
 * it else returns value from modified state
 */
const getSanitisedModifiedValue = function(
  fieldId: FieldId,
  modifiedState: ModelState,
  sanitisedState?: ModelState
): any {
  const sanitisedValue = sanitisedState && sanitisedState[fieldId];
  return sanitisedValue || modifiedState[fieldId];
};

const getInvalidFields = function(
  // TODO this one-off interface is getting complicated
  // it may be worth having a common interface that
  // contains all information for each field, and used
  // for sanitisation, validation and delta checking
  list: {
    fieldId: FieldId;
    isArrayField: boolean;
    value: any;
    typeConfig: BaseTypeConfig;
  }[]
): FieldId[] {
  const invalidFields: FieldId[] = [];

  list.forEach(({ fieldId, value, typeConfig }) => {
    const { validator } = typeConfig;
    if (validator && !validator({ value })) {
      invalidFields.push(fieldId);
    }
  });

  return invalidFields;
};

const matchFieldsToConfigList = function(
  fieldMatch: FieldMatch,
  fieldConfigList: FieldConfig[]
): FieldConfig[] {
  let matchedFieldConfigList: FieldConfig[];
  const getFieldConfig = (fieldId: FieldId) =>
    fieldConfigList.find(fieldConfig => fieldConfig.fieldId === fieldId);
  if (Array.isArray(fieldMatch)) {
    matchedFieldConfigList = [];
    fieldMatch.forEach(f => {
      if (Array.isArray(f)) {
        f.forEach(fieldId =>
          matchedFieldConfigList.push(getFieldConfig(fieldId))
        );
      } else {
        matchedFieldConfigList.push(getFieldConfig(f));
      }
    });
  } else {
    matchedFieldConfigList = [getFieldConfig(fieldMatch)];
  }
  return matchedFieldConfigList;
};

/**
 * The type `FieldMatch` can allow users to
 * conditionalise the match in a fashion similar
 * to 'AND' / 'OR' operators. This groups those
 * together in a manner that simplifies the
 * matching method.
 *
 * 'FDO' = `FieldDeltaOutcome`
 */
const conditionallyGroupFDOList = (
  fieldDeltaOutcomeList: FieldDeltaOutcome[],
  fieldMatch: FieldMatch
) => {
  const grouped = { every: [], some: [] } as {
    every: FieldDeltaOutcome[];
    some: Array<FieldDeltaOutcome[]>;
  };
  const getFDOForField = (fieldId: FieldId) =>
    fieldDeltaOutcomeList.find(fDO => fDO.fieldId === fieldId);

  if (Array.isArray(fieldMatch)) {
    fieldMatch.forEach(fieldId => {
      if (Array.isArray(fieldId)) {
        grouped.some.push(fieldId.map(getFDOForField));
      } else {
        grouped.every.push(getFDOForField(fieldId));
      }
    });
  } else {
    grouped.every.push(getFDOForField(fieldMatch));
  }
  return grouped;
};

const getFieldTypeConfig = function(
  typeConfigList: TypeConfig[],
  fieldConfig: FieldConfig
): BaseTypeConfig {
  const { fieldId, typeId, ...typeConfigForField } = fieldConfig;
  if (typeId) {
    const typeConfig = typeConfigList.find(config => config.typeId === typeId);
    const baseTypeConfig = {
      ...typeConfig,
      ...typeConfigForField
    };
    delete baseTypeConfig.typeId;
    return baseTypeConfig;
  } else {
    return typeConfigForField;
  }
};

const isDeltaCheckConfig = function(
  deltaCheck: DeltaCheck
): deltaCheck is DeltaCheckConfig {
  if (
    !deltaCheck ||
    typeof deltaCheck === 'boolean' ||
    typeof deltaCheck === 'function'
  ) {
    return false;
  } else {
    return true;
  }
};

const isDeltaForArray = function(deltaValues: DeltaValues): boolean {
  return (
    Array.isArray(deltaValues.existingValue) ||
    Array.isArray(deltaValues.modifiedValue)
  );
};

const generateArrayDelta = function(
  deltaValues: DeltaValues,
  delta: Delta
): ArrayDelta {
  const { existingValue, modifiedValue } = deltaValues;

  const arrayDelta: ArrayDelta = {
    added: [],
    removed: [],
    moved: []
  };

  if (Array.isArray(existingValue) && !Array.isArray(modifiedValue)) {
    existingValue.forEach((removedItem, index) =>
      arrayDelta.removed.push([removedItem, index])
    );
  } else if (Array.isArray(modifiedValue) && !Array.isArray(existingValue)) {
    modifiedValue.forEach((newItem, index) =>
      arrayDelta.added.push([newItem, index])
    );
  } else {
    const keys = Object.keys(delta).filter(k => k !== '_t');

    keys.forEach(key => {
      const _d = delta[key];
      if (/^[0-9]*$/.test(key)) {
        const newIndex = Number.parseInt(key);
        arrayDelta.added.push([deltaValues.modifiedValue[newIndex], newIndex]);
      } else {
        // either removed or moved
        if (_d[1] === 0 && _d[2] === 0) {
          const previousIndex = Number.parseInt(key.replace('_', ''));
          const _val = deltaValues.existingValue[previousIndex];
          arrayDelta.removed.push([_val, previousIndex]);
        } else {
          const previousIndex = Number.parseInt(key.replace('_', ''));
          const newIndex = Number.parseInt(_d[1]);
          const _val = deltaValues.existingValue[previousIndex];
          // diff lib does not store value when moved
          arrayDelta.moved.push([_val, previousIndex, newIndex]);
        }
      }
    });
  }
  return arrayDelta;
};

const doesValueMatchExpected = function(
  valueMatch: ValueMatch,
  value: InputValue
): boolean {
  let match: boolean;
  if (hasProperty(valueMatch, 'value')) {
    match = valueMatch.value === value;
  } else if (hasProperty(valueMatch, 'validate')) {
    match = valueMatch.manual({ value });
  } else if (hasProperty(valueMatch, 'presence')) {
    match = {
      [ValueMatchPresence.Forbidden]: value === undefined,
      [ValueMatchPresence.Required]: value !== undefined,
      [ValueMatchPresence.Optional]: true
    }[valueMatch.presence];
  }
  return match;
};

const GetIntentionsInput_S = Joi.object({
  modifiedState: ModelState_S.required(),
  existingState: ModelState_S.optional()
});
export interface GetIntentionsInput {
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
export interface GetIntentionsResponse {
  intentIds: IntentId[];
  fieldDeltaOutcomeList: FieldDeltaOutcome[];
  sanitisations?: ModelState;
}

export { getIntentions, GetIntentionsResponse_S };
