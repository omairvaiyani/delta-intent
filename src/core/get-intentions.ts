import { ModelConfiguration } from './model-configuration';
import {
  ModelState,
  InputValue,
  FieldId,
  ModelId,
  IntentId
} from '../interfaces/base-types';
import {
  FieldDeltaOutcome,
  FieldMatch,
  DeltaMatch,
  ArrayDelta,
  DeltaCheck,
  DeltaCheckConfig,
  ValueMatch,
  ValueMatchPresence,
  GroupedFDOList
} from '../interfaces/match-config-types';
import { FieldConfig } from '../interfaces/field-config-types';
import { DeltaValues, Delta } from '../interfaces/delta-types';
import {
  performCustomDeltaCheck,
  defaultDeltaCheck
} from '../utils/delta-checkers';
import { BaseTypeConfig, TypeConfig } from '../interfaces/custom-types';
import { hasProperty, safeId } from '../utils/common';
import { InvalidFieldValue } from '../interfaces/error-types';
import { DeltaIntentError, throwIfInvalidShape } from '../utils/validator';
import {
  GetIntentionsInput,
  GetIntentionsResponse,
  GetIntentionsInput_S,
  FieldModificationData,
  FieldWithTypeConfigMap,
  IntentFieldData,
  GetIntentionsError,
  GetIntentionsOptions,
  MatchConfigItemData,
  FieldDeltaData
} from '../interfaces/get-intentions-types';
import { isUndefined, isNullOrUndefined } from 'util';
import {
  DefaultInvalidValueMessage,
  ValidatorParams,
  ValidatorOutcome,
  Validator,
  ValidatorBaseParams
} from '../interfaces/validator-types';
import {
  IntentConfig,
  Operation,
  ExternalPolicy,
  InternalPolicy
} from '../interfaces/intent-config-types';
import { ErrorMessage, ErrorCode } from './errors';

const getIntentions = function(
  modelConfiguration: ModelConfiguration,
  input: GetIntentionsInput,
  options: GetIntentionsOptions = {}
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
        ErrorMessage.UnexpectedType('ModelConfiguration', modelConfiguration)
      );
    }

    throwIfInvalidShape(input, GetIntentionsInput_S);
    const {
      typeConfigList,
      fieldConfigList,
      intentConfigList
    } = modelConfiguration;
    const fieldIds = fieldConfigList.map(f => f.fieldId);

    const unknownFields = getUnknownFieldsFromInput(fieldIds, input);
    if (unknownFields.length) {
      return {
        error: getFailedResponse(
          modelIdSafe,
          ErrorCode.InvalidModifiedState,
          ErrorMessage.UnknownFieldInState,
          {
            info: {
              unknownFields
            }
          }
        )
      };
    }

    const { existingState, modifiedState } = input;

    const isCreate = isUndefined(existingState);

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

    const validatorBaseParams: ValidatorBaseParams = {
      modifiedState,
      existingState,
      postState: {
        ...(existingState || {}),
        ...modifiedState
      },
      isCreate,
      context: {
        ...input.context || {}
      }
    };


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
      const invalidFields = getInvalidFields(
        validatorBaseParams,
        fieldModificationList
      );
      if (invalidFields.length) {
        return {
          error: getFailedResponse(
            modelIdSafe,
            ErrorCode.InvalidModifiedState,
            ErrorMessage.InvalidModifiedState,
            {
              invalidFields
            }
          )
        };
      }
    }

    let fieldDeltaOutcomeList: FieldDeltaOutcome[] = [];

    debug(`input is ${existingState ? `create` : 'update'}`);

    const isInModifedStateFMDList = fieldModificationList.filter(
      fMD => fMD.isInModifiedState
    );
    const isInModifiedStateFieldIds = isInModifedStateFMDList.map(
      fMD => fMD.fieldId
    );

    const intentFieldDataList = intentConfigList
      .filter(matchIntentConfigByOperationType.bind(null, isCreate))
      .map(intentConfig =>
        getIntentFieldData(intentConfig, fieldModificationList)
      );

    const firstPassIFDList: IntentFieldData[] = [];

    intentFieldDataList.forEach(intentFieldData => {
      const {
        intentConfig,
        acceptableFMDList,
        optionalFMDList,
        matchConfigItemDataList
      } = intentFieldData;
      debug(`checking intent: ${safeId(intentConfig.intentId)}`);

      const { internalPolicy } = intentConfig;
      const isStrict = internalPolicy === InternalPolicy.Strict;
      if (isStrict) {
        const acceptableFieldIds = acceptableFMDList.map(fMD => fMD.fieldId);
        const unacceptableFieldIds = isInModifiedStateFieldIds.filter(
          fieldId => !acceptableFieldIds.includes(fieldId)
        );
        if (unacceptableFieldIds.length) {
          verbose(
            `will not match due to strict policy and unacceptable fields found: ${unacceptableFieldIds}`
          );
          return false;
        } else if (
          isInModifiedStateFieldIds.length < acceptableFieldIds.length
        ) {
          const optionalFieldIds = optionalFMDList.map(fMD => fMD.fieldId);
          const missingFieldIds = acceptableFMDList.filter(
            fMD =>
              !fMD.isInModifiedState && !optionalFieldIds.includes(fMD.fieldId)
          );
          if (missingFieldIds.length) {
            verbose(
              `will not match due to strict policy and missing fields: ${missingFieldIds}`
            );
            return false;
          }
        }
      }

      const isIntent = matchConfigItemDataList.every(
        ({ matchConfigItem, matchedFMDList, flatFDOList, groupedFDOList }) => {
          debug(`matching ${matchConfigItem.fieldMatch}`);

          verbose(`${matchedFMDList.length} fields to match against`);

          const _AND_fDOMatch = groupedFDOList.every.length
            ? groupedFDOList.every.every(fDO => fDO.didMatch)
            : true;
          const _OR_fDOMatch = groupedFDOList.some.length
            ? groupedFDOList.some.every(fDOGroup =>
                fDOGroup.some(fDO => fDO.didMatch)
              )
            : true;

          verbose(`adding ${flatFDOList.length} field delta outcomes to list`);

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
        firstPassIFDList.push(intentFieldData);
        verbose(`total ${firstPassIFDList.length} intents matched so far`);
      }
    });

    // if more than one, find the first exlusive match
    const matchedIntentFieldDataList = filterMatchedIntentsByPolicy(
      firstPassIFDList
    );

    if (matchedIntentFieldDataList.length) {
      const matchedFieldIds: FieldId[] = matchedIntentFieldDataList
        .map(intentFieldData =>
          intentFieldData.acceptableFMDList.map(fMD => fMD.fieldId)
        )
        .reduce((a, b) => a.concat(b), []);

      const unmatchedFMDList = isInModifedStateFMDList
        .filter(fMD => fMD.deltaData.didChange)
        .filter(fMD => !matchedFieldIds.includes(fMD.fieldId));

      if (unmatchedFMDList.length) {
        return {
          error: getFailedResponse(
            modelIdSafe,
            ErrorCode.InvalidModifiedState,
            ErrorMessage.UnmatchedFieldInModifiedState,
            {
              info: {
                unmatchedFieldIds: unmatchedFMDList.map(fMD => fMD.fieldId)
              }
            }
          )
        };
      }
    } else if (isInModifedStateFMDList.some(fMD => fMD.deltaData.didChange)) {
      // no intentions found, but some fields have changed
      return {
        error: getFailedResponse(
          modelIdSafe,
          ErrorCode.InvalidModifiedState,
          ErrorMessage.UninterpretedIntention
        )
      };
    }

    const matchedIntentIds = matchedIntentFieldDataList.map(
      iFD => iFD.intentConfig.intentId
    );

    const response: GetIntentionsResponse = {
      intentIds: matchedIntentIds,
      isIntent(intentId: IntentId) {
        return matchedIntentIds.includes(intentId);
      },
      fieldDelta(fieldId: FieldId) {
        const fieldModificationData = fieldModificationList.find(
          fMD => fMD.fieldId === fieldId
        );
        if (!fieldModificationData) {
          throw new DeltaIntentError(
            ErrorCode.InvalidArgument,
            ErrorMessage.InvalidArgument(
              'fieldId',
              fieldId,
              `no such field exists in the ${modelIdSafe} model`
            )
          );
        }
        return fieldModificationData.deltaData;
      }
    };

    if (existingState) {
      response.fieldDeltaOutcomeList = fieldDeltaOutcomeList;
    }

    return response;
  } catch (e) {
    if (e instanceof DeltaIntentError) {
      return {
        error: getFailedResponse(modelIdSafe, e.code, e.message, {
          info: e.info
        })
      };
    } else {
      return {
        error: getFailedResponse(
          modelIdSafe,
          ErrorCode.UnknownError,
          `An unknown error occurred within delta-intent; ${e.message}`,
          {
            info: {
              stack: e.stack
            }
          }
        )
      };
    }
  }
};

const getFailedResponse = function(
  modelId: ModelId,
  code: string,
  message: string,
  options: {
    info?: Record<string, any>;
    invalidFields?: InvalidFieldValue[];
  } = {}
): GetIntentionsError {
  const error = {
    modelId,
    code,
    message,
    info: options.info,
    invalidFields: options.invalidFields
  };

  if (!error.info) {
    delete error.info;
  }
  if (!error.invalidFields) {
    delete error.invalidFields;
  }

  return error;
};

const getIntentFieldData = function(
  intentConfig: IntentConfig,
  fieldModificationList: FieldModificationData[]
): IntentFieldData {
  const acceptableFMDList = intentConfig.matchConfig.items
    .map(matchConfigItem =>
      filterFMDListByMatchConfig(
        matchConfigItem.fieldMatch,
        fieldModificationList
      )
    )
    .reduce((a, b) => a.concat(b), []);

  const optionalFMDList = acceptableFMDList.length
    ? intentConfig.matchConfig.items
        .filter(
          matchConfigItem =>
            matchConfigItem.deltaMatch &&
            matchConfigItem.deltaMatch.modifiedState &&
            matchConfigItem.deltaMatch.modifiedState.presence ===
              ValueMatchPresence.Optional
        )
        .map(matchConfigItem =>
          filterFMDListByMatchConfig(
            matchConfigItem.fieldMatch,
            fieldModificationList
          )
        )
        .reduce((a, b) => a.concat(b), [])
    : [];

  const matchConfigItemDataList: MatchConfigItemData[] = intentConfig.matchConfig.items.map(
    matchConfigItem => {
      const matchedFMDList = filterFMDListByMatchConfig(
        matchConfigItem.fieldMatch,
        fieldModificationList
      );
      const flatFDOList = matchedFMDList.map(fieldModificationData => {
        const fDO: FieldDeltaOutcome = discernFieldDeltaOutcome(
          fieldModificationData,
          matchConfigItem.deltaMatch
        );

        return fDO;
      });
      const groupedFDOList = conditionallyGroupFDOList(
        flatFDOList,
        matchConfigItem.fieldMatch
      );
      return {
        matchConfigItem,
        matchedFMDList,
        flatFDOList,
        groupedFDOList
      };
    }
  );

  return {
    intentConfig,
    acceptableFMDList,
    optionalFMDList,
    matchConfigItemDataList
  };
};

const getFieldDeltaData = function(
  fieldModificationData: FieldModificationData
): FieldDeltaData {
  const {
    fieldId,
    typeConfig,
    isInModifiedState,
    isArray,
    deltaValues
  } = fieldModificationData;

  const deltaData: FieldDeltaData = (() => {
    let _delta: Delta;
    let _arrayDelta: ArrayDelta;
    return {
      fieldId,
      get delta(): Delta {
        return _delta;
      },
      set delta(delta: Delta) {
        _delta = delta;
      },
      get arrayDelta(): ArrayDelta {
        return _arrayDelta;
      },
      set arrayDelta(arrayDelta: ArrayDelta) {
        _arrayDelta = arrayDelta;
      },
      get didChange(): boolean {
        return !isUndefined(this.delta);
      }
    };
  })();

  if (isInModifiedState) {
    if (typeConfig.deltaChecker) {
      deltaData.delta = performCustomDeltaCheck(
        deltaValues,
        typeConfig.deltaChecker
      );
    } else {
      deltaData.delta = defaultDeltaCheck(deltaValues, {
        differOptions: { objectHasher: typeConfig.objectHasher }
      });
    }
    if (isArray || isDeltaForArray(deltaValues)) {
      deltaData.arrayDelta = generateArrayDelta(deltaValues, deltaData.delta);
    }
  }

  return deltaData;
};

const discernFieldDeltaOutcome = function(
  fieldModificationData: FieldModificationData,
  deltaMatch: DeltaMatch
): FieldDeltaOutcome {
  const {
    fieldConfig,
    isInModifiedState,
    isArray,
    deltaValues,
    deltaData
  } = fieldModificationData;
  const { deltaCheck, existingState, modifiedState } = deltaMatch;

  let didMatch = false;

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
      // delta checks already performed, but here
      // we have an override from the intent config
      deltaData.delta = performCustomDeltaCheck(deltaValues, deltaCheck);
      if (isArray || isDeltaForArray(deltaValues)) {
        deltaData.arrayDelta = generateArrayDelta(deltaValues, deltaData.delta);
      }
    } else if (isDeltaCheckConfig(deltaCheck)) {
      if (deltaCheck.arrayChanges) {
        const {
          added: _added,
          removed: _removed,
          moved: _moved
        } = deltaCheck.arrayChanges;
        const { added, removed, moved } = deltaData.arrayDelta || {
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
    } else if (typeof deltaCheck === 'boolean') {
      didMatch = deltaCheck === deltaData.didChange;
    }
  }

  const outcome: FieldDeltaOutcome = {
    fieldId: fieldConfig.fieldId,
    didMatch,
    deltaData
  };

  return outcome;
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

const getUnknownFieldsFromInput = (
  fieldIds: FieldId[],
  input: GetIntentionsInput
): string[] => {
  const { existingState, modifiedState } = input;

  const unknownFields = (state: any) =>
    Object.keys(state).filter(key => !fieldIds.includes(key));

  return Array.from(
    new Set(
      unknownFields(modifiedState).concat(
        existingState ? unknownFields(existingState) : []
      )
    )
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
    isRequired: !!fieldConfig.isRequired,
    isImmutable: !!fieldConfig.isImmutable,
    isInModifiedState: hasProperty(states.modified, safeId(fieldId)),
    rawValues: {},
    deltaValues: undefined,
    deltaData: undefined
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

    data.deltaData = getFieldDeltaData(data);
  } else {
    data.deltaData = {
      fieldId,
      didChange: false,
      delta: undefined
    };
  }

  return data;
};

const getInvalidFields = function(
  baseParams: ValidatorBaseParams,
  fieldModificationList: FieldModificationData[]
): InvalidFieldValue[] {
  const invalidFields: InvalidFieldValue[] = [];

  const runValidators = (
    validator: Validator | Validator[],
    params: ValidatorParams
  ) =>
    Array.isArray(validator)
      ? validator.map(v => v(params))
      : [validator(params)];

  const isFailedOutcome = (outcome: ValidatorOutcome) =>
    outcome === false || typeof outcome === 'string';

  const didFailValidation = (outcomes: ValidatorOutcome[]) =>
    outcomes.some(isFailedOutcome);

  const getReasonFromOutcomes = (outcomes: ValidatorOutcome[]) =>
    outcomes
      .filter(isFailedOutcome)
      .map(o => (typeof o === 'string' ? o : DefaultInvalidValueMessage));

  const simplifyReasons = (reasons: string[]) =>
    reasons.length === 1 ? reasons[0] : reasons;
  fieldModificationList.forEach(fieldModificationData => {
    const {
      fieldId,
      typeConfig,
      isArray,
      deltaValues,
      isRequired,
      isImmutable,
      isInModifiedState,
      deltaData
    } = fieldModificationData;
    const { validator } = typeConfig;

    let isValid: boolean = true;
    let reason: string | string[];

    let modifiedValue: any;
    if (isInModifiedState) {
      modifiedValue = deltaValues.modifiedValue;
    }

    // the following two checks (isRequired and isImmutable) will run on
    // all fields, even if they're not in the modified state
    if (isRequired && baseParams.isCreate && !isInModifiedState) {
      isValid = false;
      reason = ErrorMessage.RequiredFieldMissing;
    }

    if (isValid && deltaData.didChange && isImmutable && !baseParams.isCreate) {
      // immutable field has been found inside the modified state of an update
      // operation - check if the value has actually been changed
      isValid = false;
      reason = ErrorMessage.ImmutableFieldChanged;
    }

    // The remaining checks will only run if the field
    // has been modified
    if (isValid && deltaData.didChange && validator) {
      const validatorParams: ValidatorParams = {
        ...baseParams,
        modifiedValue
      };
      if (!isUndefined(deltaValues.existingValue)) {
        validatorParams.existingValue = deltaValues.existingValue;
      }
      if (isArray) {
        if (isNullOrUndefined(modifiedValue) && isRequired) {
          isValid = false;
        } else {
          if (Array.isArray(modifiedValue)) {
            const invalidItems = modifiedValue
              .map(modifiedValue =>
                runValidators(validator, {
                  ...validatorParams,
                  modifiedValue
                })
              )
              .filter(didFailValidation)
              .map((outcomes, index) => [
                index,
                simplifyReasons(getReasonFromOutcomes(outcomes))
              ]);
            if (invalidItems.length) {
              isValid = false;
              reason = ErrorMessage.MultipleInvalidItems(
                invalidItems.map(item => ({
                  key: item[0] as string,
                  reason: item[1] as string
                }))
              );
            }
          } else {
            isValid = false;
            reason = ErrorMessage.UnexpectedType('array', modifiedValue);
          }
        }
      } else {
        if (isRequired && isNullOrUndefined(modifiedValue)) {
          isValid = false;
          reason = ErrorMessage.RequiredFieldMissing;
        } else {
          const outcomes = runValidators(validator, validatorParams);
          if (didFailValidation(outcomes)) {
            const reasons = getReasonFromOutcomes(outcomes);
            isValid = false;
            reason = simplifyReasons(reasons);
          }
        }
      }
    }
    if (!isValid) {
      invalidFields.push({ fieldId, value: modifiedValue, reason });
    }
  });

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
  const findFMDForField = (fieldId: FieldId): FieldModificationData =>
    fieldModificationList.find(fMD => fMD.fieldId === fieldId);

  if (Array.isArray(fieldMatch)) {
    matchedFieldModificationList = [];
    fieldMatch.forEach(f => {
      if (Array.isArray(f)) {
        f.forEach(fieldId =>
          matchedFieldModificationList.push(findFMDForField(fieldId))
        );
      } else {
        matchedFieldModificationList.push(findFMDForField(f));
      }
    });
  } else {
    matchedFieldModificationList = [findFMDForField(fieldMatch)];
  }
  return matchedFieldModificationList;
};

/**
 * The type `FieldMatch` can allow users to
 * conditionalise the match in a fashion similar
 * to 'AND' / 'OR' operators. This method
 * groups those together in a manner that
 * simplifies the matching algorithm.
 *
 * 'FDO' = `FieldDeltaOutcome`
 */
const conditionallyGroupFDOList = (
  fieldDeltaOutcomeList: FieldDeltaOutcome[],
  fieldMatch: FieldMatch
): GroupedFDOList => {
  const grouped = { every: [], some: [] };
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

/**
 * If `intentConfig` specifies a particular
 * op type, this will match only those;
 *
 * i.e. for `Operation.Update`, `isOperationCreate`
 * must be false on this
 */
const matchIntentConfigByOperationType = function(
  isOperationCreate: boolean,
  intentConfig: IntentConfig
): boolean {
  if (intentConfig.operation) {
    return (
      {
        [Operation.Create]: true,
        [Operation.Update]: false,
        [Operation.Any]: isOperationCreate
      }[intentConfig.operation] === isOperationCreate
    );
  } else {
    return true;
  }
};

const filterMatchedIntentsByPolicy = function(
  intentFieldDataList: IntentFieldData[]
): IntentFieldData[] {
  return intentFieldDataList.length === 1
    ? intentFieldDataList
    : intentFieldDataList.some(
        iFD => iFD.intentConfig.externalPolicy === ExternalPolicy.Exclusive
      )
    ? [
        intentFieldDataList.find(
          iFD => iFD.intentConfig.externalPolicy === ExternalPolicy.Exclusive
        )
      ]
    : intentFieldDataList;
};

export { getIntentions };
