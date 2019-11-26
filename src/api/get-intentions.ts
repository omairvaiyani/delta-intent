import { ModelConfiguration } from './model-configuration';
import {
  ModelState,
  IntentId,
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
import {
  GetIntentionsInput,
  GetIntentionsResponse,
  GetIntentionsInput_S,
  FieldModificationData,
  FieldWithTypeConfigMap
} from '../interfaces/get-intentions-types';
import { isUndefined } from 'util';

const getIntentions = function(
  modelConfiguration: ModelConfiguration,
  input: GetIntentionsInput,
  options: { skipValidation?: boolean; debug?: boolean; verbose?: boolean } = {}
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

    const fieldWithTypeConfigList: FieldWithTypeConfigMap[] = fieldConfigList.map(
      fieldConfig => ({
        fieldConfig,
        typeConfig: getFieldTypeConfig(typeConfigList, fieldConfig)
      })
    );

    const sanitisedState: ModelState | null = getSanitizedInput(
      fieldWithTypeConfigList
        .filter(map => map.typeConfig.sanitiser)
        .filter(map => isFieldModified(modifiedState, map.fieldConfig)),
      modifiedState,
      existingState
    );

    const fieldModificationList = fieldConfigList.map(fieldConfig =>
      getFieldModificationData(
        fieldConfig,
        fieldWithTypeConfigList.find(
          map => map.fieldConfig.fieldId === fieldConfig.fieldId
        ).typeConfig,
        {
          modified: modifiedState,
          sanitised: sanitisedState,
          existing: existingState
        }
      )
    );

    if (options.skipValidation) {
      verbose('opted to skip validation');
    } else {
      const isInModifiedStateFMDList = fieldModificationList.filter(
        fMD => fMD.isInModifiedState
      );
      verbose(`validating ${isInModifiedStateFMDList.length} modified fields`);
      const invalidFields = getInvalidFields(isInModifiedStateFMDList);
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

            const matchedFMDList = filterFMDListByMatchConfig(
              fieldMatch,
              fieldModificationList
            );
            verbose(`${matchedFMDList.length} fields to match against`);

            const flatFDOList = matchedFMDList.map(fieldModificationData => {
              const {
                fieldId,
                isInModifiedState,
                deltaValues
              } = fieldModificationData;
              verbose(`${fieldId}: getting delta outcome`);

              debug({
                fieldId,
                isInModifiedState,
                deltaValues
              });

              verbose({
                deltaMatch
              });

              const fDO: FieldDeltaOutcome = discernFieldDeltaOutcome(
                fieldModificationData,
                deltaMatch
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
      e.modelId = modelIdSafe;
      throw e;
    } else {
      throw new DeltaIntentError(ErrorCode.UnknownError, e.message);
    }
  }
};

const discernFieldDeltaOutcome = function(
  fieldModificationData: FieldModificationData,
  deltaMatch: DeltaMatch
): FieldDeltaOutcome {
  const {
    typeConfig,
    fieldConfig,
    isInModifiedState,
    isArray,
    deltaValues
  } = fieldModificationData;
  const { deltaCheck, existingState, modifiedState } = deltaMatch;

  let didMatch: boolean = false;
  let delta: Delta;
  let arrayDelta: ArrayDelta;

  if (existingState || modifiedState) {
    const [existingStateMatches, modifiedStateMatches] = [
      existingState
        ? doesValueMatchExpected(
            existingState,
            isInModifiedState ? deltaValues.existingValue : undefined
          )
        : true,
      doesValueMatchExpected(
        modifiedState,
        isInModifiedState ? deltaValues.modifiedValue : undefined
      )
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
  fieldWithTypeConfigList: FieldWithTypeConfigMap[],
  modifiedState: ModelState,
  existingState: ModelState
): ModelState | null {
  const sanitizedState: ModelState = {};
  let didSanitiseAny: boolean;
  fieldWithTypeConfigList.forEach(({ fieldConfig, typeConfig }) => {
    const { fieldId } = fieldConfig;
    const { sanitiser } = typeConfig;
    if (sanitiser) {
      const deltaValues: DeltaValues = {
        modifiedValue: modifiedState[fieldId]
      };
      if (existingState) {
        deltaValues.existingValue = existingState[fieldId];
      }
      const { didSanitise, sanitisedValue } = sanitiser(deltaValues);
      if (didSanitise) {
        sanitizedState[fieldConfig.fieldId] = sanitisedValue;
        didSanitiseAny = true;
      }
    }
  });
  return didSanitiseAny ? sanitizedState : null;
};

const getFieldModificationData = function(
  fieldConfig: FieldConfig,
  typeConfig: BaseTypeConfig,
  states: {
    modified: ModelState;
    existing?: ModelState;
    sanitised?: ModelState;
  }
): FieldModificationData {
  const { fieldId } = fieldConfig;
  const data: FieldModificationData = {
    fieldId,
    fieldConfig,
    typeConfig,
    isArray: !!fieldConfig.isArray,
    isInModifiedState: hasProperty(states.modified, safeId(fieldId)),
    rawValues: {},
    deltaValues: undefined
  };

  if (states.existing) {
    data.rawValues.existing = states.existing[fieldId];
  }

  if (data.isInModifiedState) {
    const modifiedValue = states.modified[fieldId];
    data.rawValues.modified = modifiedValue;
    data.deltaValues = {
      modifiedValue,
      existingValue: data.rawValues.existing
    };

    const sanitisedValue = states.sanitised
      ? states.sanitised[fieldId]
      : undefined;
    if (typeof sanitisedValue !== 'undefined') {
      data.rawValues.sanitised = sanitisedValue;
      data.deltaValues.modifiedValue = sanitisedValue;
    }
  }

  return data;
};

const getInvalidFields = function(
  fieldModificationList: FieldModificationData[]
): FieldId[] {
  const invalidFields: FieldId[] = [];

  fieldModificationList.forEach(
    ({ fieldId, typeConfig, isArray, deltaValues }) => {
      const { validator } = typeConfig;
      if (validator) {
        const value = deltaValues.modifiedValue;
        const validatorParams = { modifiedValue: value } as any;
        if (!isUndefined(deltaValues.existingValue)) {
          validatorParams.existingValue = deltaValues.existingValue;
        }
        let isValid: boolean;
        if (isArray) {
          // if exists, ensure it's array
          // and each item is valid,
          // else skip validation
          // NOTE: this may need configuration
          // such as `isRequired` in array validation
          isValid = isUndefined(value)
            ? true
            : Array.isArray(value)
            ? value.every(v =>
                validator({ ...validatorParams, modifiedValue: v })
              )
            : false;
        } else {
          isValid = validator(validatorParams);
        }
        if (!isValid) {
          invalidFields.push(fieldId);
        }
      }
    }
  );

  return invalidFields;
};

/**
 * `FMD` = FieldModificationData
 */
const filterFMDListByMatchConfig = function(
  fieldMatch: FieldMatch,
  fieldModificationList: FieldModificationData[]
): FieldModificationData[] {
  let matchedFieldModificationList: FieldModificationData[];
  const getFieldModificationData = (fieldId: FieldId): FieldModificationData =>
    fieldModificationList.find(fMD => fMD.fieldId === fieldId);
  if (Array.isArray(fieldMatch)) {
    matchedFieldModificationList = [];
    fieldMatch.forEach(f => {
      if (Array.isArray(f)) {
        f.forEach(fieldId =>
          matchedFieldModificationList.push(getFieldModificationData(fieldId))
        );
      } else {
        matchedFieldModificationList.push(getFieldModificationData(f));
      }
    });
  } else {
    matchedFieldModificationList = [getFieldModificationData(fieldMatch)];
  }
  return matchedFieldModificationList;
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
    match = valueMatch.manual({ modifiedValue: value });
  } else if (hasProperty(valueMatch, 'presence')) {
    match = {
      [ValueMatchPresence.Forbidden]: value === undefined,
      [ValueMatchPresence.Required]: value !== undefined,
      [ValueMatchPresence.Optional]: true
    }[valueMatch.presence];
  }
  return match;
};

export { getIntentions };
