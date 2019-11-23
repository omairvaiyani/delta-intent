import Joi from '@hapi/joi';
import {
  ModelId,
  ModelState,
  IntentId,
  InputValue,
  ModelId_S
} from '../interfaces/base-types';
import {
  IIntentConfig,
  IIntentConfig_S
} from '../interfaces/intent-config-types';
import { IFieldConfig, IFieldConfig_S } from '../interfaces/field-config-types';
import {
  FieldMatch,
  DeltaMatch,
  FieldDeltaOutcome,
  DeltaCheck,
  DeltaCheckConfig,
  ArrayDelta
} from '../interfaces/match-config-types';
import { DeltaValues, Delta } from '../interfaces/delta-types';
import {
  performCustomDeltaCheck,
  defaultDeltaCheck
} from '../utils/delta-checkers';
import {
  ITypeConfig,
  BaseTypeConfig,
  ITypeConfig_S
} from '../interfaces/custom-types';
import { TypeConfigStore } from './type-config-store';
import { throwIfInvalidShape, throwIfDuplicates } from '../utils/validator';

const ConstructorParams_S = Joi.object({
  modelId: ModelId_S.required(),
  fieldConfigList: Joi.array()
    .items(IFieldConfig_S)
    .min(1)
    .required(),
  intentConfigList: Joi.array()
    .items(IIntentConfig_S)
    .min(1)
    .required(),
  typeConfigStore: Joi.object()
    .type(TypeConfigStore)
    .optional(),
  typeConfigList: Joi.array()
    .items(ITypeConfig_S)
    .min(1)
    .optional()
});

class ModelConfiguration {
  readonly modelId: ModelId;
  readonly fieldConfigList: IFieldConfig[];
  readonly intentConfigList: IIntentConfig[];
  private typeConfigStore?: TypeConfigStore;

  constructor(input: ModelConfiguration.ConstructorParams) {
    throwIfInvalidShape(input, ConstructorParams_S.required());
    throwIfDuplicates(input.fieldConfigList, 'fieldId');
    throwIfDuplicates(input.intentConfigList, 'intentId');
    if (input.typeConfigList) {
      throwIfDuplicates(input.typeConfigList, 'typeId');
    }

    this.modelId = input.modelId;
    this.fieldConfigList = input.fieldConfigList;
    this.intentConfigList = input.intentConfigList;
    this.typeConfigStore = input.typeConfigStore;
    this._typeConfigList = input.typeConfigList;
  }

  public getIntentions(
    input: ModelConfiguration.GetIntentionsInput
  ): ModelConfiguration.GetIntentionsResponse {
    const { existingState, modifiedState } = input;
    const { fieldConfigList, intentConfigList } = this;

    const modifiedFieldsToSanitize = fieldConfigList
      .filter(field => field.sanitizer)
      .filter(this.isFieldModified.bind(this, modifiedState));

    const sanitizedState: ModelState | null = this.getSanitizedInput(
      modifiedFieldsToSanitize,
      modifiedState,
      existingState
    );

    const intentIds: IntentId[] = [];
    let fieldDeltaOutcomeList: FieldDeltaOutcome[] = [];

    intentConfigList
      .filter(intentConfig =>
        intentConfig.isCreate ? !existingState : existingState
      )
      .forEach(intentConfig =>
        intentConfig.matchConfig.items.every(matchConfigItem => {
          const { fieldMatch, deltaMatch } = matchConfigItem;
          const matchedFieldConfigList = this.matchFieldsToConfigList(
            fieldMatch,
            fieldConfigList
          );
          if (
            matchedFieldConfigList.every(fieldConfig =>
              this.isFieldModified(modifiedState, fieldConfig)
            )
          ) {
            const _fieldDeltaOutcomeList = matchedFieldConfigList.map(
              fieldConfig =>
                this.performDeltaCheck(fieldConfig, deltaMatch, {
                  existingValue: existingState[fieldConfig.fieldId],
                  modifiedValue:
                    (sanitizedState && sanitizedState[fieldConfig.fieldId]) ||
                    modifiedState[fieldConfig.fieldId]
                })
            );
            const isIntent = _fieldDeltaOutcomeList.every(
              outcome => outcome.didMatch
            );
            if (isIntent) {
              intentIds.push(intentConfig.intentId);
              fieldDeltaOutcomeList = [
                ...fieldDeltaOutcomeList,
                ..._fieldDeltaOutcomeList
              ];
            }
          }
        })
      );

    return {
      intentIds,
      fieldDeltaOutcomeList
    };
  }

  private isFieldModified(
    modifiedState: ModelState,
    fieldConfig: IFieldConfig
  ): boolean {
    return Object.prototype.hasOwnProperty.call(
      modifiedState,
      fieldConfig.fieldId
    );
  }

  private getSanitizedInput(
    fields: IFieldConfig[],
    modifiedState: ModelState,
    existingState: ModelState
  ): ModelState | null {
    const sanitizedState: ModelState = {};
    let didSanitizeAny: boolean;
    fields.forEach(field => {
      if (field.sanitizer) {
        const fieldKey = field.fieldId;
        const deltaValues: DeltaValues = {
          modifiedValue: modifiedState[fieldKey]
        };
        if (existingState) {
          deltaValues.existingValue = modifiedState[field.fieldId];
        }
        const { didSanitize, sanitizedValue } = field.sanitizer(deltaValues);
        if (didSanitize) {
          sanitizedState[field.fieldId] = sanitizedValue;
          didSanitizeAny = true;
        }
      }
    });
    return didSanitizeAny ? sanitizedState : null;
  }

  private matchFieldsToConfigList(
    fieldMatch: FieldMatch,
    fieldConfigList: IFieldConfig[]
  ): IFieldConfig[] {
    let matchedFieldConfigList: IFieldConfig[];
    if (Array.isArray(fieldMatch)) {
      matchedFieldConfigList = fieldMatch.map(fieldKey =>
        fieldConfigList.find(fieldConfig => fieldConfig.fieldId === fieldKey)
      );
    } else {
      matchedFieldConfigList = [
        fieldConfigList.find(fieldConfig => fieldConfig.fieldId === fieldMatch)
      ];
    }
    return matchedFieldConfigList;
  }

  private performDeltaCheck(
    fieldConfig: IFieldConfig,
    deltaMatch: DeltaMatch,
    deltaValues: DeltaValues
  ): FieldDeltaOutcome {
    const { deltaCheck, existingState, modifiedState } = deltaMatch;
    const typeConfig = this.getFieldTypeConfig(fieldConfig);
    if (deltaCheck) {
      let delta: Delta;
      if (typeof deltaCheck === 'function') {
        delta = performCustomDeltaCheck(deltaValues, deltaCheck);
      } else if (typeConfig.deltaChecker) {
        delta = performCustomDeltaCheck(deltaValues, typeConfig.deltaChecker);
      } else {
        delta = defaultDeltaCheck(deltaValues, {
          differOptions: { objectHasher: typeConfig.objectHasher }
        });
      }

      let arrayDelta: ArrayDelta;
      if (this.isDeltaForArray(delta)) {
        arrayDelta = this.generateArrayDelta(deltaValues, delta);
      }

      let didMatch: boolean = false;
      if (this.isDeltaCheckConfig(deltaCheck)) {
        if (deltaCheck.ifUnchanged) {
          didMatch = !delta;
        } else if (deltaCheck.arrayChanges) {
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

      return {
        fieldId: fieldConfig.fieldId,
        delta,
        didMatch,
        arrayDelta
      };
    }
  }

  private getFieldTypeConfig(fieldConfig: IFieldConfig): BaseTypeConfig {
    const { fieldId, typeId, ...typeConfigForField } = fieldConfig;
    if (typeId) {
      const typeConfig = this.typeConfigList.find(
        config => config.typeId === typeId
      );
      const baseTypeConfig = {
        ...typeConfig,
        ...typeConfigForField
      };
      delete baseTypeConfig.typeId;
      return baseTypeConfig;
    } else {
      return typeConfigForField;
    }
  }

  private isDeltaCheckConfig(
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
  }

  private isDeltaForArray(delta: Delta): boolean {
    return delta && !Array.isArray(delta) && delta._t === 'a';
  }

  private generateArrayDelta(
    deltaValues: DeltaValues,
    delta: Delta
  ): ArrayDelta {
    const keys = Object.keys(delta).filter(k => k !== '_t');
    const arrayDelta: ArrayDelta = {
      added: [],
      removed: [],
      moved: []
    };

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

    return arrayDelta;
  }

  /**
   * Merges type configs from `typeConfigStore`
   * and model specific `_typeConfigList`. In
   * case of duplicates, `_typeConfigList` type
   * configs are used.
   */
  private get typeConfigList(): ITypeConfig[] {
    const { typeConfigStore, _typeConfigList } = this;
    let list: ITypeConfig[] = [];
    if (_typeConfigList) {
      list = [..._typeConfigList];
    }
    if (typeConfigStore) {
      typeConfigStore.typeConfigList.forEach(typeConfig => {
        if (!list.find(tC => tC.typeId === typeConfig.typeId)) {
          list.push(typeConfig);
        }
      });
    }
    return list;
  }

  /**
   * Model specific types
   */
  private _typeConfigList: ITypeConfig[];
}

namespace ModelConfiguration {
  export interface ConstructorParams {
    modelId: ModelId;
    fieldConfigList: IFieldConfig[];
    intentConfigList: IIntentConfig[];
    typeConfigList?: ITypeConfig[];
    typeConfigStore?: TypeConfigStore;
  }
  export interface GetIntentionsInput {
    modifiedState: ModelState;
    existingState?: ModelState;
  }
  export interface GetIntentionsResponse {
    intentIds: IntentId[];
    fieldDeltaOutcomeList: FieldDeltaOutcome[];
    sanitisations?: Record<string, InputValue>;
  }
}

export { ModelConfiguration };
